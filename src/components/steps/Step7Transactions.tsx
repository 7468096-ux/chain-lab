import { useI18n, type Key, type Params } from "../../i18n";
import { short, signMsg, verifyMsg, type Keys } from "../../lib/keys";
import { useStore } from "../../lib/useStore";
import { Preparing } from "../bits";

export const USERS = ["Alice", "Bob", "Carol"] as const;
type User = (typeof USERS)[number];
const START: Record<User, number> = { Alice: 10, Bob: 5, Carol: 0 };

interface Tx {
  from: User;
  to: User;
  amount: number;
  sig: string;
}
interface S7State {
  keys: Partial<Record<User, Keys>>;
  bal: Record<User, number>;
  pool: Tx[];
  blocks: { n: number; txs: (Tx & { ok: boolean })[] }[];
  form: { from: User; to: User; amount: string; signer: User };
  msg: { ok: boolean; k: Key; a?: Params } | null;
}

export function useStep7() {
  const store = useStore<S7State>(() => ({
    keys: {},
    bal: { ...START },
    pool: [],
    blocks: [],
    form: { from: "Alice", to: "Bob", amount: "3", signer: "Alice" },
    msg: null,
  }));
  const [, set, ref] = store;
  const setMsg = (ok: boolean, k: Key, a?: Params) => set({ msg: { ok, k, a } });

  async function send() {
    const { form: f, keys } = ref.current;
    const amount = Number(f.amount);
    if (f.from === f.to) return setMsg(false, "sentSelf");
    if (!(amount > 0)) return setMsg(false, "sentAmount");
    const text = `${f.from}->${f.to}:${amount}`;
    const sig = await signMsg(keys[f.signer]!, text);
    const ok = await verifyMsg(keys[f.from]!, text, sig);
    if (!ok) return setMsg(false, "sentForged", { s: f.signer, f: f.from });
    set(s => ({ pool: [...s.pool, { from: f.from, to: f.to, amount, sig }] }));
    setMsg(true, "sentOk");
  }
  function mine() {
    const s = ref.current;
    if (!s.pool.length) return setMsg(false, "noTx");
    const bal = { ...s.bal };
    const txs = s.pool.map(tx => {
      const ok = bal[tx.from] >= tx.amount;
      if (ok) {
        bal[tx.from] -= tx.amount;
        bal[tx.to] += tx.amount;
      }
      return { ...tx, ok };
    });
    set({ bal, blocks: [{ n: s.blocks.length + 1, txs }, ...s.blocks], pool: [], msg: null });
  }
  function reset() {
    set({ bal: { ...START }, pool: [], blocks: [], msg: null });
  }
  return { store, send, mine, reset };
}
type S7 = ReturnType<typeof useStep7>;

export function Step7Transactions({ s7, ready }: { s7: S7; ready: boolean }) {
  const { t } = useI18n();
  const [s, set] = s7.store;
  if (!ready || !s.keys.Carol) return <Preparing />;
  const f = s.form;
  const setForm = (p: Partial<S7State["form"]>) => set(st => ({ form: { ...st.form, ...p } }));
  const opts = USERS.map(u => (
    <option key={u} value={u}>
      {u}
    </option>
  ));

  return (
    <>
      <div className="stats">
        {USERS.map(u => (
          <div className="stat" key={u}>
            <span>
              {u} · {short(s.keys[u]!.addr, 6, 4)}
            </span>
            <b>{s.bal[u]}</b>
          </div>
        ))}
      </div>
      <div className="txform">
        <div className="field">
          <label className="lbl" htmlFor="t7f">
            {t("from")}
          </label>
          <select id="t7f" value={f.from} onChange={e => setForm({ from: e.target.value as User, signer: e.target.value as User })}>
            {opts}
          </select>
        </div>
        <div className="field">
          <label className="lbl" htmlFor="t7t">
            {t("to")}
          </label>
          <select id="t7t" value={f.to} onChange={e => setForm({ to: e.target.value as User })}>
            {opts}
          </select>
        </div>
        <div className="field">
          <label className="lbl" htmlFor="t7a">
            {t("amount")}
          </label>
          <input type="number" id="t7a" min={1} step={1} inputMode="numeric" value={f.amount} onChange={e => setForm({ amount: e.target.value })} />
        </div>
        <div className="field">
          <label className="lbl" htmlFor="t7s">
            {t("signWith")}
          </label>
          <select id="t7s" value={f.signer} onChange={e => setForm({ signer: e.target.value as User })}>
            {opts}
          </select>
        </div>
      </div>
      <div className="pbtns">
        <button type="button" className="primary" onClick={s7.send}>
          {t("send")}
        </button>
      </div>
      <p className={"summary" + (s.msg ? (s.msg.ok ? " ok" : " bad") : "")}>{s.msg ? t(s.msg.k, s.msg.a) : ""}</p>
      <div className="field">
        <div className="lbl">{t("mempool")}</div>
        <div>
          {s.pool.length ? (
            <ul className="txlist">
              {s.pool.map((x, i) => (
                <li key={i}>
                  <span>
                    {x.from} → {x.to}: {x.amount}
                  </span>
                  <span className="hash sm prev">sig {short(x.sig, 8, 4)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">{t("emptyPool")}</p>
          )}
        </div>
      </div>
      <div className="pbtns">
        <button type="button" className="primary" onClick={s7.mine}>
          {t("mineTx")}
        </button>
        <button type="button" className="ghost" onClick={s7.reset}>
          {t("reset")}
        </button>
      </div>
      <div className="field">
        <div className="lbl">{t("history")}</div>
        <div>
          {s.blocks.length ? (
            s.blocks.map(b => (
              <div className="txblock" key={b.n}>
                <b>{t("blockOf", { n: b.n, k: b.txs.length })}</b>
                <ul className="txlist">
                  {b.txs.map((x, i) => (
                    <li key={i} className={x.ok ? "in" : "out"}>
                      <span>
                        {x.from} → {x.to}: {x.amount}
                      </span>
                      <span>{x.ok ? t("included") : t("rejectedFunds")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="note">—</p>
          )}
        </div>
      </div>
      <p className="note">{t("s7n")}</p>
    </>
  );
}
