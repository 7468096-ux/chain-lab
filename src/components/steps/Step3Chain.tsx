import { useRef } from "react";
import { useI18n } from "../../i18n";
import { computeChain, mineBlock, okHash, type BlockData, type Link } from "../../lib/hash";
import { useStore } from "../../lib/useStore";
import { Hx, Preparing, SeedWarn, Status } from "../bits";

export const CHAIN_DATA = ["Genesis", "Alice → Bob: 5", "Bob → Carol: 2", "Carol → Dan: 1"];

interface S3State {
  blocks: BlockData[];
  chain: Link[] | null;
  pristine: BlockData[] | null;
  busy: number | null; // index of the block being mined
}

export function useStep3() {
  const store = useStore<S3State>(() => ({ blocks: CHAIN_DATA.map(d => ({ data: d, nonce: 0 })), chain: null, pristine: null, busy: null }));
  const [, set, ref] = store;
  const ver = useRef(0);

  async function recompute() {
    const v = ++ver.current;
    const c = await computeChain(ref.current.blocks);
    if (v === ver.current) set({ chain: c });
  }
  function edit(i: number, data: string) {
    set(s => ({ blocks: s.blocks.map((b, j) => (j === i ? { ...b, data } : b)) }));
    recompute();
  }
  async function mine(i: number) {
    if (ref.current.busy != null) return;
    set({ busy: i });
    await recompute();
    const prev = ref.current.chain![i].prev;
    const data = ref.current.blocks[i].data;
    const n = await mineBlock(i, data, prev);
    if (n != null && ref.current.blocks[i].data === data) set(s => ({ blocks: s.blocks.map((b, j) => (j === i ? { ...b, nonce: n } : b)) }));
    set({ busy: null });
    await recompute();
  }
  function reset() {
    set(s => ({ blocks: s.pristine!.map(b => ({ ...b })) }));
    recompute();
  }
  return { store, edit, mine, reset };
}
type S3 = ReturnType<typeof useStep3>;

export function Step3Chain({ s3, ready }: { s3: S3; ready: boolean }) {
  const { t } = useI18n();
  const [s] = s3.store;
  if (!ready || !s.chain) return <Preparing />;
  const chain = s.chain;
  let broken = 0;
  chain.forEach((c, i) => {
    if (!okHash(c.hash) && !broken) broken = i + 1;
  });

  return (
    <>
      <p className={"summary " + (broken ? "bad" : "ok")}>{broken ? t("chainBroken", { k: broken }) : t("chainOk")}</p>
      <div className="chain">
        {s.blocks.map((b, i) => {
          const ok = okHash(chain[i].hash);
          return (
            <div className={"mblock" + (ok ? " valid" : "")} key={i}>
              <div className="mhead">
                <b>{t("blockLbl", { i: i + 1 })}</b>
                <Status ok={ok} />
              </div>
              <label className="lbl" htmlFor={"md" + i}>
                {t("fData")}
              </label>
              <input type="text" id={"md" + i} value={b.data} autoComplete="off" onChange={e => s3.edit(i, e.target.value)} />
              <SeedWarn text={b.data} />
              <div className="lbl">{t("fNonce")}</div>
              <div className="val">{b.nonce}</div>
              <div className="lbl">{t("fPrev")}</div>
              <div className="hash prev sm">
                <Hx h={chain[i].prev} />
              </div>
              <div className="lbl">{t("fHash")}</div>
              <div className="hash sm">
                <Hx h={chain[i].hash} />
              </div>
              <button type="button" className="ghost" onClick={() => s3.mine(i)}>
                {s.busy === i ? t("running") : t("mineOne")}
              </button>
            </div>
          );
        })}
      </div>
      <div>
        <button type="button" className="ghost" onClick={s3.reset}>
          {t("resetChain")}
        </button>
      </div>
    </>
  );
}
