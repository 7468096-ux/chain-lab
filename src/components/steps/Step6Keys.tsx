import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { genKeys, short, signMsg, verifyMsg, type Keys } from "../../lib/keys";
import { useStore } from "../../lib/useStore";
import { Preparing, SeedWarn } from "../bits";

interface S6State {
  me: Keys | null;
  showPriv: boolean;
  msg: string;
  sig: string | null;
  vmsg: string;
}

export function useStep6() {
  const store = useStore<S6State>(() => ({ me: null, showPriv: false, msg: "I, the owner, agree to pay 3 coins", sig: null, vmsg: "" }));
  const [, set, ref] = store;
  async function newKeys() {
    set({ me: await genKeys(), sig: null, vmsg: "" });
  }
  async function sign() {
    const s = ref.current;
    const sig = await signMsg(s.me!, s.msg);
    set({ sig, vmsg: s.msg });
  }
  return { store, newKeys, sign };
}
type S6 = ReturnType<typeof useStep6>;

export function Step6Keys({ s6, ready }: { s6: S6; ready: boolean }) {
  const { t } = useI18n();
  const [s, set] = s6.store;
  const [check, setCheck] = useState<{ vmsg: string; sig: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!s.sig || !s.me) return;
    let live = true;
    const { vmsg, sig } = s;
    verifyMsg(s.me, vmsg, sig).then(ok => live && setCheck({ vmsg, sig, ok }));
    return () => {
      live = false;
    };
  }, [s.me, s.sig, s.vmsg]);

  if (!ready || !s.me) return <Preparing />;
  const k = s.me;
  const res = s.sig && check && check.vmsg === s.vmsg && check.sig === s.sig ? check.ok : null;

  return (
    <>
      <div>
        <button type="button" className="ghost" onClick={s6.newKeys}>
          {t("newKeys")}
        </button>
      </div>
      <div className="block anat">
        <div className="row">
          <div className="k">{t("privKey")}</div>
          <div className="v">
            <div className="hash sm">{s.showPriv ? k.privHex : "•".repeat(32)}</div>
            <div className="pbtns mt6">
              <button type="button" className="ghost" onClick={() => set({ showPriv: !s.showPriv })}>
                {s.showPriv ? t("hide") : t("show")}
              </button>
            </div>
            <small className="expl">{t("privWarn")}</small>
          </div>
        </div>
        <div className="row">
          <div className="k">{t("pubKey")}</div>
          <div className="v">
            <div className="hash sm">{short(k.pubHex, 24, 12)}</div>
          </div>
        </div>
        <div className="row">
          <div className="k">{t("address")}</div>
          <div className="v">
            <div className="val">{k.addr}</div>
          </div>
        </div>
      </div>
      <div className="field">
        <label className="lbl" htmlFor="s6m">
          {t("message")}
        </label>
        <input type="text" id="s6m" value={s.msg} autoComplete="off" onChange={e => set({ msg: e.target.value })} />
        <SeedWarn text={s.msg} />
      </div>
      <div>
        <button type="button" className="primary" onClick={s6.sign}>
          {t("sign")}
        </button>
      </div>
      <div className="field">
        <div className="lbl">{t("signature")}</div>
        <div className="hash sm">{s.sig ? short(s.sig, 32, 12) : t("notSigned")}</div>
      </div>
      <div className="card inset">
        <h4>{t("checkH")}</h4>
        <div className="field">
          <label className="lbl" htmlFor="s6v">
            {t("checkMsg")}
          </label>
          <input type="text" id="s6v" value={s.vmsg} autoComplete="off" disabled={!s.sig} onChange={e => set({ vmsg: e.target.value })} />
          <SeedWarn text={s.vmsg} />
        </div>
        <p className={"summary" + (res == null ? "" : res ? " ok" : " bad")}>
          {res == null ? "" : res ? t("sigOk", { a: short(k.addr, 8, 4) }) : t("sigBad")}
        </p>
      </div>
      <p className="note">{t("s6n")}</p>
    </>
  );
}
