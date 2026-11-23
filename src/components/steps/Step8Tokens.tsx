import { useI18n, type Key } from "../../i18n";
import { sha256 } from "../../lib/hash";
import { useStore } from "../../lib/useStore";
import { Preparing, SeedWarn } from "../bits";
import { USERS } from "./Step7Transactions";

interface Entry {
  w: string;
  id: string;
  owner: string; // "you" or a user name
}
interface S8State {
  reg: Entry[];
  word: string;
  as: string;
  msg: { ok: boolean; k: Key; w?: string; o?: string } | null;
}

function normWord(w: string): { w: string } | { err: Key } {
  const s = w.normalize("NFKC").trim().toLowerCase();
  const lat = /[a-z]/.test(s),
    cyr = /[а-яё]/.test(s);
  if (lat && cyr) return { err: "mixed" };
  if (!/^[a-z0-9-]{3,20}$/.test(s) && !/^[а-яё0-9-]{3,20}$/.test(s)) return { err: "badWord" };
  return { w: s };
}

export function useStep8() {
  const store = useStore<S8State>(() => ({ reg: [], word: "", as: "you", msg: null }));
  const [, set, ref] = store;
  async function claim(raw: string, owner: string) {
    const r = normWord(raw);
    if ("err" in r) return set({ msg: { ok: false, k: r.err } });
    const ex = ref.current.reg.find(x => x.w === r.w);
    if (ex) return set({ msg: { ok: false, k: "taken", w: r.w, o: ex.owner } });
    const id = await sha256(r.w);
    set(s => ({ reg: [...s.reg, { w: r.w, id, owner }], msg: { ok: true, k: "claimed", w: r.w, o: owner } }));
  }
  return { store, claim };
}
type S8 = ReturnType<typeof useStep8>;

const TRY = ["Satoshi", "pаypal", "chainlab"]; // the middle one has a Cyrillic "а"

export function Step8Tokens({ s8, ready }: { s8: S8; ready: boolean }) {
  const { t } = useI18n();
  const [s, set] = s8.store;
  if (!ready) return <Preparing />;
  const ownerName = (o: string) => (o === "you" ? t("you") : o);
  const opts = ["you", ...USERS].map(o => (
    <option key={o} value={o}>
      {ownerName(o)}
    </option>
  ));

  return (
    <>
      <div className="txform">
        <div className="field">
          <label className="lbl" htmlFor="w8">
            {t("word")}
          </label>
          <input type="text" id="w8" value={s.word} autoComplete="off" spellCheck={false} onChange={e => set({ word: e.target.value })} />
          <SeedWarn text={s.word} />
        </div>
        <div className="field">
          <label className="lbl" htmlFor="w8as">
            {t("claimAs")}
          </label>
          <select id="w8as" value={s.as} onChange={e => set({ as: e.target.value })}>
            {opts}
          </select>
        </div>
      </div>
      <div className="pbtns">
        <button type="button" className="primary" onClick={() => s8.claim(s.word, s.as)}>
          {t("claim")}
        </button>
        <span className="lbl mid">
          {t("tryThese")}
        </span>
        {TRY.map(w => (
          <button
            key={w}
            type="button"
            className="ghost"
            onClick={() => {
              set({ word: w });
              s8.claim(w, s.as);
            }}
          >
            {w}
          </button>
        ))}
      </div>
      <p className={"summary" + (s.msg ? (s.msg.ok ? " ok" : " bad") : "")}>
        {s.msg ? t(s.msg.k, s.msg.w != null ? { w: s.msg.w, o: ownerName(s.msg.o!) } : undefined) : ""}
      </p>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("thWord")}</th>
              <th>{t("thId")}</th>
              <th>{t("thOwner")}</th>
            </tr>
          </thead>
          <tbody>
            {s.reg.map((x, i) => (
              <tr key={x.id}>
                <td>{x.w}</td>
                <td>#{x.id.slice(0, 12)}</td>
                <td>
                  <select
                    aria-label={t("thOwner")}
                    value={x.owner}
                    onChange={e => set(st => ({ reg: st.reg.map((y, j) => (j === i ? { ...y, owner: e.target.value } : y)) }))}
                  >
                    {opts}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">{t("transferNote")}</p>
      <p className="note">{t("s8n")}</p>
    </>
  );
}
