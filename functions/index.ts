// GET / → 302 to /ru/ or /en/ by Accept-Language. A saved choice (localStorage) is applied on the client after the redirect.

type Lang = "en" | "ru";

export function pickLang(header: string | null): Lang {
  const prefs = (header || "")
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map(p => p.trim()).find(p => p.startsWith("q="));
      return { base: tag.split("-")[0], q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter(p => p.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const p of prefs) if (p.base === "ru" || p.base === "en") return p.base;
  return "en";
}

export const onRequest: PagesFunction = ({ request }) => {
  const url = new URL(request.url);
  const lang = pickLang(request.headers.get("Accept-Language"));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${lang}/${url.search}`,
      Vary: "Accept-Language",
      "Cache-Control": "private, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
};
