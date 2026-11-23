/// <reference lib="webworker" />
// Brute-force nonce search off the main thread.
// Payload for nonce n is `prefix + n + suffix`. Hashes are computed in parallel batches,
// but the result is the same as a sequential search: the smallest valid n from `start`.

export interface FindRequest {
  prefix: string;
  suffix: string;
  zeros: number;
  start: number;
  maxMs: number;
}

export type WorkerMsg =
  | { type: "progress"; n: number; tries: number; ms: number }
  | { type: "found"; n: number; hash: string; tries: number; ms: number }
  | { type: "timeout"; n: number; tries: number; ms: number };

const BATCH = 256;
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");

self.onmessage = async (e: MessageEvent<FindRequest>) => {
  const { prefix, suffix, zeros, start, maxMs } = e.data;
  const target = "0".repeat(zeros);
  const post = (m: WorkerMsg) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);
  const t0 = performance.now();
  let n = start;
  let lastReport = t0;
  for (;;) {
    const batch = Array.from({ length: BATCH }, (_, i) => crypto.subtle.digest("SHA-256", enc.encode(prefix + (n + i) + suffix)));
    const hashes = await Promise.all(batch);
    for (let i = 0; i < BATCH; i++) {
      const h = hex(hashes[i]);
      if (h.startsWith(target)) {
        post({ type: "found", n: n + i, hash: h, tries: n + i - start + 1, ms: performance.now() - t0 });
        return;
      }
    }
    n += BATCH;
    const now = performance.now();
    if (now - t0 > maxMs) {
      post({ type: "timeout", n, tries: n - start, ms: now - t0 });
      return;
    }
    if (now - lastReport > 100) {
      lastReport = now;
      post({ type: "progress", n, tries: n - start, ms: now - t0 });
    }
  }
};
