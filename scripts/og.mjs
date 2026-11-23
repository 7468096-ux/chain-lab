// Renders public/og-en.png and public/og-ru.png (1200×630) with headless Chrome or Edge.
// Usage: npm run og   (needs network for Google Fonts; set CHROME=path to override the browser)
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const BROWSERS = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = BROWSERS.find(p => existsSync(p));
if (!browser) throw new Error("No Chrome/Edge found; set CHROME=/path/to/chrome");

const dict = l => JSON.parse(readFileSync(`src/i18n/${l}.json`, "utf8"));
const CHAIN = [
  ["#1", "000a3f9c1e7d", "Genesis"],
  ["#2", "0007be41c09a", "Alice → Bob: 5"],
  ["#3", "000e52d8f4b3", "Bob → Carol: 2"],
];

const page = l => {
  const T = dict(l);
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--ink:#0d1117;--panel:#151b24;--rule:#263040;--paper:#e8e4da;--muted:#8b95a5;--gold:#e3b341;--ok:#3fb950}
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:var(--ink);color:var(--paper);font:20px/1.5 "IBM Plex Sans",sans-serif;padding:64px 72px;display:grid;grid-template-rows:auto 1fr auto;gap:28px;
  background-image:repeating-linear-gradient(to bottom,transparent 0 41px,rgba(38,48,64,.35) 41px 42px)}
.brand{display:flex;align-items:center;gap:16px}
.brand b{font:700 26px/1.1 Unbounded,sans-serif;letter-spacing:.02em;display:block}
.brand small{color:var(--muted);font-size:17px}
.eyebrow{font:500 17px "IBM Plex Mono",monospace;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
h1{font:700 ${l === "ru" ? 60 : 66}px/1.08 Unbounded,sans-serif;margin:0;max-width:17ch}
h1 em{font-style:normal;color:var(--gold)}
.chain{display:flex;gap:14px;align-items:center}
.blk{flex:1;background:var(--panel);border:1px solid var(--rule);border-top:4px solid var(--ok);border-radius:10px;padding:14px 16px;display:grid;gap:4px}
.blk .h{display:flex;justify-content:space-between;font:500 16px "IBM Plex Mono",monospace}
.st{font:500 13px "IBM Plex Mono",monospace;padding:2px 10px;border-radius:99px;background:rgba(63,185,80,.15);color:var(--ok)}
.d{color:var(--muted);font-size:16px}
.hash{font:16px "IBM Plex Mono",monospace}.z{color:var(--ok)}
.arrow{color:var(--gold);font:500 22px "IBM Plex Mono",monospace}
</style></head><body>
<div class="brand"><svg width="48" height="48" viewBox="0 0 34 34"><rect x="1" y="11" width="10" height="12" rx="2" fill="none" stroke="#e3b341" stroke-width="2"/><rect x="12" y="11" width="10" height="12" rx="2" fill="none" stroke="#e3b341" stroke-width="2"/><rect x="23" y="11" width="10" height="12" rx="2" fill="#e3b341"/></svg>
<div><b>${T.brand}</b><small>${T.tagline}</small></div></div>
<div style="align-self:center"><div class="eyebrow">${T.eyebrow}</div><h1>${T.h1}</h1></div>
<div class="chain">${CHAIN.map(([n, h, d], i) => `${i ? '<span class="arrow">→</span>' : ""}<div class="blk"><div class="h"><span>${n}</span><span class="st">${T.valid}</span></div><div class="d">${d}</div><div class="hash"><span class="z">000</span>${h.slice(3)}…</div></div>`).join("")}</div>
</body></html>`;
};

const dir = mkdtempSync(join(tmpdir(), "chainlab-og-"));
for (const l of ["en", "ru"]) {
  const html = join(dir, `og-${l}.html`);
  writeFileSync(html, page(l));
  const out = resolve(`public/og-${l}.png`);
  execFileSync(browser, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=1200,630", "--virtual-time-budget=8000", `--screenshot=${out}`, pathToFileURL(html).href,
  ], { stdio: "ignore" });
  console.log("wrote", out);
}
