# Chain Lab

Interactive lab that shows how a blockchain works: hashes, blocks, mining, keys, transactions, tokens, and a decoder for real Bitcoin and Ethereum transactions. English and Russian.

Vite + React + TypeScript, prerendered to static `/en/` and `/ru/` pages, hosted on Cloudflare Pages with Pages Functions. Cryptography uses only the browser's Web Crypto API (SHA-256, ECDSA P-256).

## Commands

```sh
npm install
npm run dev         # Vite dev server, http://localhost:5173 (/api is proxied to pages:dev)
npm run build       # type-check, client + SSR build, prerender /en/ and /ru/, sitemap.xml, robots.txt
npm run pages:dev   # the built site with Pages Functions, http://localhost:8788
npm run og          # re-render public/og-en.png and og-ru.png with local Chrome/Edge
```

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | GitHub repo secret | Lets `.github/workflows/deploy.yml` deploy (permission: Cloudflare Pages → Edit). |
| `ETH_RPC_URL` | GitHub repo secret (with a key) or variable (keyless); `.dev.vars` locally | Ethereum mainnet JSON-RPC endpoint for `/api/tx`; the workflow stores it as a Pages secret. Prefer a provider with full transaction history (Alchemy, Infura, QuickNode…). |
| `SITE_URL` | GitHub repo variable | Absolute origin for canonical, hreflang, Open Graph and sitemap. Defaults to `https://chain-lab-e17.pages.dev`. |

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: build, `wrangler pages deploy` to the Pages project `chain-lab`, then a live check (pages, redirect, headers, sitemap, OG images, `/api/tx`).

Copy `.dev.vars.example` to `.dev.vars` for local runs. Never commit real keys.

## Layout

```
src/i18n/            en.json, ru.json
src/lib/             hash.ts (+ hash.worker.ts), keys.ts, tx.ts, seed.ts
src/components/      page sections, steps/Step1Hash … Step8Tokens, TxDecoder
src/entry-server.tsx prerender entry; scripts/prerender.mjs writes dist/en, dist/ru
functions/index.ts   GET / → 302 to /en/ or /ru/ by Accept-Language
functions/api/tx.ts  GET /api/tx?id=… (mempool.space / Ethereum JSON-RPC, Cache API)
public/_headers      CSP and security headers
```

`chainlab-prototype.html` is the original single-file prototype and the reference for look and behaviour.

Educational project. Nothing here is financial advice.
