import { useEffect, useRef, useState } from "react";
import { locale, useI18n, type Key } from "../i18n";
import { detectNetwork, EXAMPLES, type Party, type TxInfo, type TxResponse } from "../lib/tx";
import { SeedWarn } from "./bits";

type View = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string; fromServer: boolean } | { kind: "done"; tx: TxInfo };

export function TxDecoder() {
  const { t, lang } = useI18n();
  const [input, setInput] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const ctrl = useRef<AbortController | null>(null);
  const lastId = useRef<string | null>(null);

  async function lookup(raw: string) {
    const det = detectNetwork(raw);
    ctrl.current?.abort();
    if (!det) {
      lastId.current = null;
      setView({ kind: "error", message: t("badFormat", { btc: EXAMPLES.pizza.slice(0, 12) + "…", eth: EXAMPLES.firstEth.slice(0, 14) + "…" }), fromServer: false });
      return;
    }
    const c = new AbortController();
    ctrl.current = c;
    lastId.current = det.id;
    setView({ kind: "loading" });
    try {
      const res = await fetch(`/api/tx?id=${det.id}&lang=${lang}`, { signal: c.signal });
      const body = (await res.json()) as TxResponse;
      if (c.signal.aborted) return;
      setView(body.ok ? { kind: "done", tx: body.tx } : { kind: "error", message: body.message, fromServer: true });
    } catch {
      if (!c.signal.aborted) setView({ kind: "error", message: t("netError"), fromServer: false });
    }
  }

  // Error texts come from the server in the page language; ask again after a language switch
  const viewRef = useRef(view);
  viewRef.current = view;
  const firstLang = useRef(lang);
  useEffect(() => {
    if (lang === firstLang.current) return;
    firstLang.current = lang;
    const v = viewRef.current;
    if (v.kind === "error" && v.fromServer && lastId.current) lookup(lastId.current);
    else if (v.kind === "error" && !v.fromServer && !lastId.current) lookup(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const tryExample = (id: string) => {
    setInput(id);
    lookup(id);
  };

  return (
    <section id="decode">
      <h2>{t("mode2")}</h2>
      <p className="sub">{t("decodeSub")}</p>
      <form
        className="decode"
        onSubmit={e => {
          e.preventDefault();
          lookup(input);
        }}
      >
        <div className="field">
          <label className="lbl" htmlFor="txid">
            {t("txLbl")}
          </label>
          <div className="decode-row">
            <input type="text" id="txid" value={input} autoComplete="off" spellCheck={false} onChange={e => setInput(e.target.value)} />
            <button type="submit" className="primary" disabled={view.kind === "loading"}>
              {t("decodeBtn")}
            </button>
          </div>
          <SeedWarn text={input} />
        </div>
        <div className="pbtns">
          <span className="lbl mid">
            {t("tryThese")}
          </span>
          <button type="button" className="ghost" onClick={() => tryExample(EXAMPLES.pizza)}>
            {t("exPizza")}
          </button>
          <button type="button" className="ghost" onClick={() => tryExample(EXAMPLES.firstEth)}>
            {t("exEth")}
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {view.kind === "loading" && <p className="note">{t("decoding")}</p>}
        {view.kind === "error" && <p className="summary bad">{view.message}</p>}
      </div>
      {view.kind === "done" && <TxCard tx={view.tx} />}
    </section>
  );
}

function TxCard({ tx }: { tx: TxInfo }) {
  const { t, lang, fmt } = useI18n();
  const btc = tx.network === "bitcoin";
  const failed = tx.success === false;

  const amount = (s: string) => {
    const [w, f] = s.split(".");
    return fmt(Number(w)) + (f ? (lang === "ru" ? "," : ".") + f : "") + " " + tx.unit;
  };
  const when = (sec: number) =>
    new Intl.DateTimeFormat(locale(lang), { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(sec * 1000) + " UTC";

  const statusPill = failed ? (
    <span className="status invalid">{t("stFailed")}</span>
  ) : tx.status === "confirmed" ? (
    <span className="status valid">{t("stConfirmed")}</span>
  ) : (
    <span className="status pending">{t("stMempool")}</span>
  );

  const rows: [Key, React.ReactNode, Key][] = [
    ["dNet", <div className="val">{btc ? t("btcName") : t("ethName")}</div>, "eNet"],
    ["dTxHash", <div className="hash sm">{tx.hash}</div>, "eTxHash"],
    ["dStatus", <div>{statusPill}</div>, failed ? "eStatusFailed" : "eStatus"],
    [
      "dBlock",
      <div className="val">{tx.block ? `#${fmt(tx.block.number)}${tx.block.time ? " · " + when(tx.block.time) : ""}` : t("pending")}</div>,
      "eBlock",
    ],
    ["dConf", <div className="val">{tx.confirmations == null ? t("pending") : fmt(tx.confirmations)}</div>, "eConf"],
    [btc ? "dInputs" : "dFrom", <PartyList parties={tx.from} total={btc ? tx.inputCount : 1} amount={amount} side="from" />, btc ? "eInputs" : "eFromEth"],
    [btc ? "dOutputs" : "dTo", <PartyList parties={tx.to} total={btc ? tx.outputCount : 1} amount={amount} side="to" />, btc ? "eOutputs" : "eToEth"],
    ["dFee", <div className="val">{tx.fee == null ? t("pending") : amount(tx.fee)}</div>, btc ? "eFeeBtc" : "eFeeEth"],
    btc
      ? ["dSize", <div className="val">{t("sizeVal", { bytes: fmt(tx.size!.bytes), vbytes: fmt(tx.size!.vbytes) })}</div>, "eSize"]
      : [
          "dGas",
          <div className="val">
            {tx.gas!.used == null
              ? t("gasPending", { limit: fmt(tx.gas!.limit), price: tx.gas!.priceGwei })
              : t("gasVal", { used: fmt(tx.gas!.used), limit: fmt(tx.gas!.limit), price: tx.gas!.priceGwei })}
          </div>,
          "eGas",
        ],
  ];

  const hasChange = tx.to.some(p => p.change);
  const coinbase = tx.from.some(p => p.coinbase);

  return (
    <div className="decoded">
      <div className="block anat">
        <div className="block-head">
          <b>
            {btc ? t("btcName") : t("ethName")} · {tx.hash.slice(0, btc ? 10 : 12)}…
          </b>
          {statusPill}
        </div>
        {rows.map(([k, v, e]) => (
          <div className="row" key={k}>
            <div className="k">{t(k)}</div>
            <div className="v">
              {v}
              <small className="expl">{t(e)}</small>
            </div>
          </div>
        ))}
      </div>
      {btc ? (
        <p className="note">
          {t("utxoNote")}
          {!hasChange && !coinbase && tx.from.length > 0 ? " " + t("noChangeNote") : ""}
        </p>
      ) : (
        <>
          <p className="note">{t("gasNote")}</p>
          {tx.contractCall && <p className="note">{t("contractNote")}</p>}
        </>
      )}
    </div>
  );
}

function PartyList({ parties, total, amount, side }: { parties: Party[]; total: number; amount: (s: string) => string; side: "from" | "to" }) {
  const { t, fmt } = useI18n();
  const shown = parties.reduce((a, p) => a + (p.count ?? 1), 0);
  return (
    <>
      {total > 1 && <div className="lbl">{t(side === "from" ? "nInputs" : "nOutputs", { n: fmt(total) })}</div>}
      <ul className="txlist">
        {parties.map((p, i) => (
          <li key={i} className={side === "to" && !p.change ? "in" : ""}>
            <span className="hash sm">
              {p.coinbase ? t("coinbase") : p.address ?? t("noAddr", { type: p.type ?? "?" })}
              {p.created ? ` (${t("newContract")})` : ""}
              {(p.count ?? 1) > 1 && <span className="nw"> {t("fromCount", { n: fmt(p.count!) })}</span>}
            </span>
            <span>
              {amount(p.amount)}
              {p.change && <span className="pill chg">{t("change")}</span>}
            </span>
          </li>
        ))}
      </ul>
      {total > shown && <div className="note">{t("andMore", { n: fmt(total - shown) })}</div>}
    </>
  );
}
