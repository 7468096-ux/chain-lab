// Turns the client build into two static pages, /en/ and /ru/, with all text in the HTML.
// Also writes sitemap.xml and robots.txt. Runs after `vite build` and `vite build --ssr`.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const SITE = (process.env.SITE_URL || "https://chain-lab-e17.pages.dev").replace(/\/+$/, "");
const dist = resolve("dist");
const { render, head, LANGS } = await import(pathToFileURL(resolve("dist-ssr/entry-server.js")).href);

const template = readFileSync(`${dist}/index.html`, "utf8");
for (const lang of LANGS) {
  const html = template
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/<meta name="description"[^>]*>\s*/, "")
    .replace("<!--head-->", head(lang, SITE))
    .replace('<div id="root"></div>', `<div id="root">${render(lang)}</div>`);
  if (html.includes("<!--head-->") || !html.includes(`<html lang="${lang}">`)) throw new Error("template markers missing");
  mkdirSync(`${dist}/${lang}`, { recursive: true });
  writeFileSync(`${dist}/${lang}/index.html`, html);
  console.log(`prerendered /${lang}/ (${(html.length / 1024).toFixed(1)} kB)`);
}
// "/" is answered by functions/index.ts (Accept-Language redirect), so no root page.
rmSync(`${dist}/index.html`);

const alt = LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}/${l}/"/>`).join("\n");
writeFileSync(
  `${dist}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map(l => `  <url>\n    <loc>${SITE}/${l}/</loc>\n${alt}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>\n  </url>`).join("\n")}
</urlset>
`,
);
writeFileSync(`${dist}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`sitemap.xml and robots.txt for ${SITE}`);
