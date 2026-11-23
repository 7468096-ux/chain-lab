import { useEffect, useState } from "react";
import { useI18n, type Key } from "../../i18n";
import { sha256 } from "../../lib/hash";
import { useStore } from "../../lib/useStore";
import { Hx, SeedWarn } from "../bits";

export function useStep2() {
  // prev is filled with sha256("genesis") when the course starts
  return useStore(() => ({ data: "Alice pays Bob 5 coins", nonce: "0", prev: "" }));
}
type S2 = ReturnType<typeof useStep2>;

export function Step2Block({ store }: { store: S2 }) {
  const { t } = useI18n();
  const [s, set] = store;
  const [hash, setHash] = useState("");
  const nonce = Number(s.nonce) || 0;

  useEffect(() => {
    let live = true;
    sha256(`2|${nonce}|${s.data}|${s.prev}`).then(h => live && setHash(h));
    return () => {
      live = false;
    };
  }, [nonce, s.data, s.prev]);

  const rows: [Key, React.ReactNode, Key][] = [
    ["fNum", <div className="val">2</div>, "eNum"],
    [
      "fData",
      <>
        <textarea rows={2} aria-label={t("fData")} value={s.data} onChange={e => set({ data: e.target.value })} />
        <SeedWarn text={s.data} />
      </>,
      "eData",
    ],
    [
      "fNonce",
      <input type="number" min={0} step={1} inputMode="numeric" aria-label={t("fNonce")} value={s.nonce} onChange={e => set({ nonce: e.target.value })} />,
      "eNonce",
    ],
    ["fPrev", <div className="hash prev">{s.prev}</div>, "ePrev"],
    [
      "fHash",
      <div className="hash">
        <Hx h={hash} />
      </div>,
      "eHash",
    ],
  ];

  return (
    <div className="block anat">
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
  );
}
