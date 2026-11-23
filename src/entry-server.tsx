import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App";
import { translate, type Lang } from "./i18n";

export const LANGS: Lang[] = ["en", "ru"];
const OG_LOCALE: Record<Lang, string> = { en: "en_US", ru: "ru_RU" };

export function render(lang: Lang): string {
  return renderToString(
    <StrictMode>
      <App initialLang={lang} />
    </StrictMode>,
  );
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Everything in <head> that differs between /en/ and /ru/. `site` is the absolute origin, no trailing slash. */
export function head(lang: Lang, site: string): string {
  const title = esc(translate(lang, "_title"));
  const desc = esc(translate(lang, "_desc"));
  const url = `${site}/${lang}/`;
  const img = `${site}/og-${lang}.png`;
  const other = lang === "en" ? "ru" : "en";
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}">`,
    `<link rel="canonical" href="${url}">`,
    ...LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${site}/${l}/">`),
    `<link rel="alternate" hreflang="x-default" href="${site}/">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Chain Lab">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}">`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[other]}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${title}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<meta name="twitter:image" content="${img}">`,
  ].join("\n");
}
