import { createContext, useContext } from "react";
import en from "./en.json";
import ru from "./ru.json";

export type Lang = "en" | "ru";
export type Key = keyof typeof en;
export type Params = Record<string, string | number>;

const DICT: Record<Lang, Record<Key, string>> = { en, ru };

export function translate(lang: Lang, key: Key, params?: Params): string {
  const s = DICT[lang][key];
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, p: string) => (p in params ? String(params[p]) : m));
}

export const locale = (lang: Lang) => (lang === "ru" ? "ru-RU" : "en-US");

export interface I18n {
  lang: Lang;
  t: (key: Key, params?: Params) => string;
  fmt: (n: number) => string;
}

export function makeI18n(lang: Lang): I18n {
  return {
    lang,
    t: (key, params) => translate(lang, key, params),
    fmt: n => n.toLocaleString(locale(lang)),
  };
}

export const I18nContext = createContext<I18n>(makeI18n("en"));
export const useI18n = () => useContext(I18nContext);

/** A message kept as key + params so it re-translates when the language changes. */
export interface Msg {
  k: Key;
  a?: Params;
}
