import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { sha256 } from "../../lib/hash";
import { useStore } from "../../lib/useStore";
import { SeedWarn } from "../bits";

export function useStep1() {
  return useStore(() => ({ text: "Hello, blockchain", show: false }));
}
type S1 = ReturnType<typeof useStep1>;

/** Bump the last character by one code point (z→a, Z→A, я→а), as in the prototype. */
function flip(s: string) {
  if (!s) return "a";
  const c = s[s.length - 1];
  const nc = c === "z" ? "a" : c === "Z" ? "A" : c === "я" ? "а" : String.fromCharCode(c.charCodeAt(0) + 1);
  return s.slice(0, -1) + nc;
}

export function Step1Hash({ store }: { store: S1 }) {
  const { t } = useI18n();
  const [s, set] = store;
  const [h, setH] = useState<{ text: string; h: string; h2: string } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const a = await sha256(s.text);
      const b = await sha256(flip(s.text));
      if (live) setH({ text: s.text, h: a, h2: b });
    })();
    return () => {
      live = false;
    };
  }, [s.text]);

  const cur = h && h.text === s.text ? h : null;
  let diff = 0;
  const changed: React.ReactNode[] = [];
  if (cur) {
    for (let i = 0; i < 64; i++) {
      const d = cur.h[i] !== cur.h2[i];
      if (d) diff++;
      changed.push(d ? <span key={i} className="dc">{cur.h2[i]}</span> : cur.h2[i]);
    }
  }

  return (
    <>
      <div className="field">
        <label className="lbl" htmlFor="s1in">
          {t("yourText")}
        </label>
        <input type="text" id="s1in" value={s.text} autoComplete="off" onChange={e => set({ text: e.target.value })} />
        <SeedWarn text={s.text} />
      </div>
      <div className="field">
        <div className="lbl">{t("original")}</div>
        <div className="hash">{cur ? cur.h : "…"}</div>
      </div>
      <div>
        <button type="button" className="ghost" onClick={() => set({ show: !s.show })}>
          {s.show ? t("changeBack") : t("changeOne")}
        </button>
      </div>
      {/* Prototype bug: there `hidden` lost to `.field { display: grid }`, so this showed "…" before the click */}
      {s.show && (
        <div className="field">
          <div className="lbl">
            {t("changed")}: <span className="val">{flip(s.text)}</span>
          </div>
          <div className="hash">{cur ? changed : "…"}</div>
        </div>
      )}
      <p className="note">{s.show && cur ? t("s1diff", { n: diff }) : ""}</p>
    </>
  );
}
