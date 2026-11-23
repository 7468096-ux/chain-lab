// Shared by the browser (TxDecoder) and the Pages Function (functions/api/tx.ts). No DOM or Workers APIs here.

export const BTC_TXID = /^[0-9a-f]{64}$/;
export const ETH_TXID = /^0x[0-9a-f]{64}$/;

/** Both checked against the live APIs before being added. */
export const EXAMPLES = {
  // Laszlo Hanyecz pays 10,000 BTC for two pizzas, block 57,043, 22 May 2010
  pizza: "a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d",
  // The first ETH transfer on mainnet, 31,337 wei, block 46,147, 7 Aug 2015
  firstEth: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
} as const;

export type Network = "bitcoin" | "ethereum";

export function detectNetwork(raw: string): { network: Network; id: string } | null {
  const id = raw.trim().toLowerCase();
  if (BTC_TXID.test(id)) return { network: "bitcoin", id };
  if (ETH_TXID.test(id)) return { network: "ethereum", id };
  return null;
}

export interface Party {
  /** null when the script has no standard address (old P2PK, OP_RETURN…) or for a new block reward */
  address: string | null;
  /** script type for Bitcoin (p2pkh, p2wpkh, op_return…) */
  type?: string;
  /** decimal string in BTC or ETH */
  amount: string;
  /** several Bitcoin inputs from one address are merged; this is how many */
  count?: number;
  /** Bitcoin output that goes back to one of the input addresses */
  change?: boolean;
  coinbase?: boolean;
  /** Ethereum: `to` is a contract being created */
  created?: boolean;
}

export interface TxInfo {
  network: Network;
  hash: string;
  unit: "BTC" | "ETH";
  status: "mempool" | "confirmed";
  /** Ethereum only: false when the transaction was included but reverted */
  success?: boolean;
  block: { number: number; time: number | null } | null;
  confirmations: number | null;
  from: Party[];
  to: Party[];
  /** total count before merging, for "131 inputs" */
  inputCount: number;
  outputCount: number;
  fee: string | null;
  size?: { bytes: number; vbytes: number };
  gas?: { limit: number; used: number | null; priceGwei: string };
  /** Ethereum: carries call data, so it talks to a contract */
  contractCall?: boolean;
}

export type TxResponse = { ok: true; tx: TxInfo } | { ok: false; error: "bad_id" | "not_found" | "unavailable"; message: string };

/** 1234500000n, 8 → "12.345" */
export function formatUnits(v: bigint, decimals: number): string {
  const neg = v < 0n;
  const a = neg ? -v : v;
  const base = 10n ** BigInt(decimals);
  const whole = a / base;
  const frac = (a % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}
