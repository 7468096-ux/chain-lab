import { useEffect, useMemo, useState } from "react";
import { I18nContext, makeI18n, translate, type Lang } from "./i18n";
import { langFromPath, saveLang } from "./lang";
import { Course } from "./components/Course";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Learn } from "./components/Learn";
import { MineLab } from "./components/MineLab";
import { Modes } from "./components/Modes";
import { TxDecoder } from "./components/TxDecoder";

export function App({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const i18n = useMemo(() => makeI18n(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translate(lang, "_title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(lang, "_desc"));
    const canonical = document.querySelector('link[rel="canonical"]');
    canonical?.setAttribute("href", canonical.getAttribute("href")!.replace(/\/(en|ru)\/$/, `/${lang}/`));
  }, [lang]);

  // Back/forward between /en/ and /ru/
  useEffect(() => {
    const onPop = () => {
      const l = langFromPath(location.pathname);
      if (l) setLang(l);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  // Switch URL without a reload so the lab and course keep their state
  const chooseLang = (l: Lang) => {
    saveLang(l);
    if (l === lang) return;
    history.pushState(null, "", `/${l}/${location.hash}`);
    setLang(l);
  };

  return (
    <I18nContext.Provider value={i18n}>
      <Header onLang={chooseLang} />
      <main className="wrap">
        <Hero />
        <Modes />
        <MineLab />
        <TxDecoder />
        <Learn />
        <Course />
      </main>
      <Footer />
    </I18nContext.Provider>
  );
}
