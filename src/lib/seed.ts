/** Same rule as the prototype: 12/15/18/21/24 Latin words of 3–8 letters. */
export function looksLikeSeed(text: string): boolean {
  const words = text.trim().toLowerCase().split(/\s+/);
  return [12, 15, 18, 21, 24].includes(words.length) && words.every(w => /^[a-z]{3,8}$/.test(w));
}
