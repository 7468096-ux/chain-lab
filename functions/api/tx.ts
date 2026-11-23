// GET /api/tx?id=<txid>&lang=en|ru
// Bitcoin via mempool.space, Ethereum via JSON-RPC at env.ETH_RPC_URL. Returns one normalized shape (TxInfo).
// Confirmed transactions are cached for 24 h, unconfirmed for 30 s (Cache API). Confirmations are computed
// per request from the chain tip (cached 30 s), so a cached transaction never shows a stale count.

import { detectNetwork, formatUnits, type Network, type Party, type TxInfo, type TxResponse } from "../../src/lib/tx";

interface Env {
  ETH_RPC_URL?: string;
}

type Lang = "en" | "ru";
type ErrCode = "bad_id" | "not_found" | "unavailable";

const MESSAGES: Record<Lang, Record<ErrCode, string>> = {
  en: {
    bad_id: "That isn't a transaction ID. Bitcoin: 64 hex characters. Ethereum: 0x followed by 64 hex characters.",
    not_found: "Transaction not found. Check the ID: maybe it belongs to the other network or to a test network.",
    unavailable: "The blockchain service is unavailable right now. Try again later.",
  },
  ru: {
    bad_id: "Это не ID транзакции. Bitcoin: 64 шестнадцатеричных символа. Ethereum: 0x и 64 шестнадцатеричных символа.",
    not_found: "Транзакция не найдена. Проверь ID: возможно, он из другой сети или из тестовой.",
    unavailable: "Сервис блокчейна сейчас недоступен. Попробуй позже.",
  },
};

const TIMEOUT_MS = 8000;
const TX_TTL = { confirmed: 86400, mempool: 30 } as const;
const TIP_TTL = 30;
const MAX_PARTIES = 50;
const CACHE_ORIGIN = "https://cache.chain-lab.internal";
const MEMPOOL = "https://mempool.space/api";

class ApiError extends Error {
  constructor(public code: ErrCode) {
    super(code);
  }
}

function pickLang(request: Request, url: URL): Lang {
  const q = url.searchParams.get("lang");
  if (q === "ru" || q === "en") return q;
  return /^\s*ru\b/i.test(request.headers.get("Accept-Language") || "") ? "ru" : "en";
}

const json = (body: TxResponse, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...extra,
    },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const url = new URL(request.url);
  const lang = pickLang(request, url);
  const fail = (code: ErrCode, status: number) => json({ ok: false, error: code, message: MESSAGES[lang][code] }, status);

  const det = detectNetwork(url.searchParams.get("id") || "");
  if (!det) return fail("bad_id", 400);
  if (det.network === "ethereum" && !env.ETH_RPC_URL) {
    console.error("ETH_RPC_URL is not set");
    return fail("unavailable", 503);
  }

  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const cache = caches.default;
  const key = new Request(`${CACHE_ORIGIN}/tx/${det.id}`);
  try {
    let tx: TxInfo;
    let hit = false;
    const cached = await cache.match(key);
    if (cached) {
      tx = await cached.json();
      hit = true;
    } else {
      tx = det.network === "bitcoin" ? await bitcoinTx(det.id, signal) : await ethereumTx(det.id, env.ETH_RPC_URL!, signal);
      const ttl = TX_TTL[tx.status];
      waitUntil(cache.put(key, new Response(JSON.stringify(tx), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` } })));
    }
    if (tx.block) {
      const tip = await chainTip(det.network, env, signal, waitUntil).catch(() => null);
      tx.confirmations = tip == null ? null : Math.max(1, tip - tx.block.number + 1);
    }
    return json({ ok: true, tx }, 200, { "X-Cache": hit ? "HIT" : "MISS" });
  } catch (e) {
    if (e instanceof ApiError) return fail(e.code, e.code === "not_found" ? 404 : 502);
    console.error("tx lookup failed", e);
    return fail("unavailable", 502);
  }
};

/* ---------- Bitcoin ---------- */

interface EsploraOut {
  scriptpubkey_address?: string;
  scriptpubkey_type: string;
  value: number;
}
interface EsploraTx {
  txid: string;
  vin: { is_coinbase: boolean; prevout: EsploraOut | null }[];
  vout: EsploraOut[];
  size: number;
  weight: number;
  fee: number;
  status: { confirmed: boolean; block_height?: number; block_time?: number };
}

async function get(url: string, signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, { signal, headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError("unavailable"); // network error or 8 s timeout
  }
}

const sats = (n: number) => formatUnits(BigInt(n), 8);

async function bitcoinTx(id: string, signal: AbortSignal): Promise<TxInfo> {
  const res = await get(`${MEMPOOL}/tx/${id}`, signal);
  if (res.status === 404 || res.status === 400) throw new ApiError("not_found");
  if (!res.ok) throw new ApiError("unavailable");
  const t: EsploraTx = await res.json();

  const outTotal = t.vout.reduce((a, o) => a + o.value, 0);
  let from: Party[];
  if (t.vin[0]?.is_coinbase) {
    from = [{ address: null, coinbase: true, amount: sats(outTotal) }];
  } else {
    // Merge inputs that spend from the same address: the pizza transaction has 131 of them
    const groups = new Map<string, Party & { sum: number }>();
    for (const v of t.vin) {
      const p = v.prevout;
      if (!p) continue;
      const k = p.scriptpubkey_address ?? `?${p.scriptpubkey_type}`;
      const g = groups.get(k) ?? { address: p.scriptpubkey_address ?? null, type: p.scriptpubkey_type, amount: "", count: 0, sum: 0 };
      g.count!++;
      g.sum += p.value;
      groups.set(k, g);
    }
    from = [...groups.values()].map(({ sum, ...g }) => ({ ...g, amount: sats(sum) }));
  }
  const inputAddrs = new Set(from.map(p => p.address).filter(Boolean));
  const to: Party[] = t.vout.map(o => ({
    address: o.scriptpubkey_address ?? null,
    type: o.scriptpubkey_type,
    amount: sats(o.value),
    change: !!o.scriptpubkey_address && inputAddrs.has(o.scriptpubkey_address),
  }));

  return {
    network: "bitcoin",
    hash: t.txid,
    unit: "BTC",
    status: t.status.confirmed ? "confirmed" : "mempool",
    block: t.status.confirmed ? { number: t.status.block_height!, time: t.status.block_time ?? null } : null,
    confirmations: null,
    from: from.slice(0, MAX_PARTIES),
    to: to.slice(0, MAX_PARTIES),
    inputCount: t.vin.length,
    outputCount: t.vout.length,
    fee: sats(t.fee),
    size: { bytes: t.size, vbytes: Math.ceil(t.weight / 4) },
  };
}

/* ---------- Ethereum ---------- */

async function rpc<T>(rpcUrl: string, method: string, params: unknown[], signal: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(rpcUrl, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  } catch {
    throw new ApiError("unavailable");
  }
  if (!res.ok) throw new ApiError("unavailable");
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) {
    console.error(method, body.error.message);
    throw new ApiError("unavailable");
  }
  return body.result as T;
}

interface EthTx {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  input: string;
  blockNumber: string | null;
  blockTimestamp?: string;
}
interface EthReceipt {
  status?: string;
  gasUsed: string;
  effectiveGasPrice?: string;
  contractAddress: string | null;
}

async function ethereumTx(id: string, rpcUrl: string, signal: AbortSignal): Promise<TxInfo> {
  const lookup = () =>
    Promise.all([
      rpc<EthTx | null>(rpcUrl, "eth_getTransactionByHash", [id], signal),
      rpc<EthReceipt | null>(rpcUrl, "eth_getTransactionReceipt", [id], signal),
    ]);
  let [tx, receipt] = await lookup();
  // Load-balanced providers mix nodes with different history indexes (geth indexes only ~1 year by default),
  // so an old transaction can come back null from one node and found from the next. Ask once more before "not found".
  if (!tx) [tx, receipt] = await lookup();
  if (!tx) throw new ApiError("not_found");

  let block: TxInfo["block"] = null;
  if (tx.blockNumber && receipt) {
    let ts = tx.blockTimestamp;
    if (!ts) ts = (await rpc<{ timestamp: string } | null>(rpcUrl, "eth_getBlockByNumber", [tx.blockNumber, false], signal))?.timestamp;
    block = { number: Number(BigInt(tx.blockNumber)), time: ts ? Number(BigInt(ts)) : null };
  }
  const price = BigInt(receipt?.effectiveGasPrice ?? tx.gasPrice ?? tx.maxFeePerGas ?? "0x0");
  const used = receipt ? BigInt(receipt.gasUsed) : null;
  const value = formatUnits(BigInt(tx.value), 18);

  return {
    network: "ethereum",
    hash: tx.hash,
    unit: "ETH",
    status: block ? "confirmed" : "mempool",
    // Receipts before the Byzantium fork (2017) have no status field; those can't have reverted visibly
    success: receipt?.status ? receipt.status === "0x1" : undefined,
    block,
    confirmations: null,
    from: [{ address: tx.from, amount: value }],
    to: [{ address: tx.to ?? receipt?.contractAddress ?? null, amount: value, created: !tx.to }],
    inputCount: 1,
    outputCount: 1,
    fee: used == null ? null : formatUnits(used * price, 18),
    gas: { limit: Number(BigInt(tx.gas)), used: used == null ? null : Number(used), priceGwei: formatUnits(price, 9) },
    contractCall: !!tx.input && tx.input !== "0x",
  };
}

/* ---------- Chain tip, for confirmations ---------- */

async function chainTip(network: Network, env: Env, signal: AbortSignal, waitUntil: (p: Promise<unknown>) => void): Promise<number> {
  const cache = caches.default;
  const key = new Request(`${CACHE_ORIGIN}/tip/${network}`);
  const hit = await cache.match(key);
  if (hit) return Number(await hit.text());
  let tip: number;
  if (network === "bitcoin") {
    const res = await get(`${MEMPOOL}/blocks/tip/height`, signal);
    if (!res.ok) throw new ApiError("unavailable");
    tip = Number(await res.text());
  } else {
    tip = Number(BigInt(await rpc<string>(env.ETH_RPC_URL!, "eth_blockNumber", [], signal)));
  }
  if (!Number.isFinite(tip)) throw new ApiError("unavailable");
  waitUntil(cache.put(key, new Response(String(tip), { headers: { "Cache-Control": `public, max-age=${TIP_TTL}` } })));
  return tip;
}
