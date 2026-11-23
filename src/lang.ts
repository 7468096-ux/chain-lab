import type { Lang } from "./i18n";

const KEY = "chainlab-lang";

export function langFromPath(path: string): Lang | null {
  const m = /^\/(en|ru)(\/|$)/.exec(path);
  return m ? (m[1] as Lang) : null;
}

export function readSavedLang(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "en" || v === "ru" ? v : null;
  } catch {
    return null;
  }
}

export function saveLang(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* storage blocked */
  }
}
