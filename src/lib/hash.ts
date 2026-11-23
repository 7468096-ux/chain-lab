import type { FindRequest, WorkerMsg } from "./hash.worker";

const enc = new TextEncoder();
export const ZERO_HASH = "0".repeat(64);
/** Difficulty used by the course chain (steps 3 and 5). */
export const D = 3;

export async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}

export const okHash = (h: string | null | undefined, d = D) => !!h && h.startsWith("0".repeat(d));

export interface Progress {
  n: number;
  tries: number;
  ms: number;
}
export type FindResult =
  | { status: "found"; n: number; hash: string; tries: number; ms: number }
  | { status: "timeout" | "stopped"; n: number; tries: number; ms: number };

export interface FindJob {
  result: Promise<FindResult>;
  /** Stops at once (terminates the worker). The result resolves with status "stopped". */
  stop: () => void;
}

/**
 * Search for the first nonce n >= start such that sha256(prefix + n + suffix) starts with `zeros` zeros.
 * Runs in a Web Worker so the page stays responsive.
 */
export function findNonce(
  opts: { prefix: string; suffix: string; zeros: number; start?: number; maxMs?: number },
  onProgress?: (p: Progress) => void,
): FindJob {
  const req: FindRequest = { prefix: opts.prefix, suffix: opts.suffix, zeros: opts.zeros, start: opts.start ?? 0, maxMs: opts.maxMs ?? 20000 };
  const worker = new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" });
  const t0 = performance.now();
  let last: Progress = { n: req.start, tries: 0, ms: 0 };
  let settle!: (r: FindResult) => void;
  let done = false;
  const result = new Promise<FindResult>(res => (settle = res));
  const finish = (r: FindResult) => {
    if (done) return;
    done = true;
    worker.terminate();
    settle(r);
  };
  worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
    const m = e.data;
    if (m.type === "progress") {
      last = { n: m.n, tries: m.tries, ms: m.ms };
      onProgress?.(last);
    } else if (m.type === "found") finish({ status: "found", n: m.n, hash: m.hash, tries: m.tries, ms: m.ms });
    else finish({ status: "timeout", n: m.n, tries: m.tries, ms: m.ms });
  };
  worker.onerror = () => finish({ status: "stopped", ...last });
  worker.postMessage(req);
  return {
    result,
    stop: () => finish({ status: "stopped", ...last, ms: performance.now() - t0 }),
  };
}

/* ---------- Chain helpers (course steps 3 and 5) ---------- */

export interface BlockData {
  data: string;
  nonce: number;
}
export interface Link {
  prev: string;
  hash: string;
}

export const blockStr = (i: number, b: BlockData, prev: string) => `${i}|${b.nonce}|${b.data}|${prev}`;

export async function computeChain(blocks: BlockData[]): Promise<Link[]> {
  const out: Link[] = [];
  let prev = ZERO_HASH;
  for (let i = 0; i < blocks.length; i++) {
    const hash = await sha256(blockStr(i + 1, blocks[i], prev));
    out.push({ prev, hash });
    prev = hash;
  }
  return out;
}

/** Mine block i (1-based number i + 1) on top of `prev`. Returns the nonce or null on timeout. */
export async function mineBlock(i: number, data: string, prev: string): Promise<number | null> {
  const r = await findNonce({ prefix: `${i + 1}|`, suffix: `|${data}|${prev}`, zeros: D }).result;
  return r.status === "found" ? r.n : null;
}

/** Re-mine every invalid block from left to right. Returns new blocks (nonces updated) and their chain. */
export async function mineChain(blocks: BlockData[]): Promise<{ blocks: BlockData[]; chain: Link[] }> {
  const bs = blocks.map(b => ({ ...b }));
  let chain = await computeChain(bs);
  for (let i = 0; i < bs.length; i++) {
    if (!okHash(chain[i].hash)) {
      const n = await mineBlock(i, bs[i].data, chain[i].prev);
      if (n != null) bs[i].nonce = n;
      chain = await computeChain(bs);
    }
  }
  return { blocks: bs, chain };
}
