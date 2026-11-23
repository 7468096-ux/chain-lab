const enc = new TextEncoder();

export const toHex = (u8: Uint8Array) => Array.from(u8, b => b.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string) => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
const b64uHex = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return toHex(Uint8Array.from(b, c => c.charCodeAt(0)));
};
export const short = (h: string, a = 10, b = 6) => (h.length > a + b + 1 ? `${h.slice(0, a)}…${h.slice(-b)}` : h);

export interface Keys {
  kp: CryptoKeyPair;
  pubHex: string;
  privHex: string;
  addr: string;
}

export async function genKeys(): Promise<Keys> {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const ah = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", pub)));
  return { kp, pubHex: toHex(pub), privHex: b64uHex(jwk.d!), addr: "0x" + ah.slice(-40) };
}

export const signMsg = async (k: Keys, m: string) =>
  toHex(new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k.kp.privateKey, enc.encode(m))));

export const verifyMsg = async (k: Keys, m: string, sig: string) => {
  try {
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k.kp.publicKey, fromHex(sig), enc.encode(m));
  } catch {
    return false;
  }
};
