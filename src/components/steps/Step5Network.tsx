import { useRef } from "react";
import { useI18n } from "../../i18n";
import { computeChain, mineChain, okHash, type BlockData, type Link } from "../../lib/hash";
import { useStore } from "../../lib/useStore";
import { Hx, Preparing, SeedWarn, Status } from "../bits";

interface Peer {
  blocks: BlockData[];
  chain: Link[];
  busy?: boolean;
}

const tipOf = (p: Peer) => p.chain[p.chain.length - 1].hash;
function majority(peers: Peer[]): string | null {
  const counts: Record<string, number> = {};
  peers.forEach(p => {
    const k = tipOf(p);
    counts[k] = (counts[k] || 0) + 1;
  });
  for (const k in counts) if (counts[k] >= 2) return k;
  return null;
}

export function useStep5() {
  const store = useStore<{ peers: Peer[] | null }>(() => ({ peers: null }));
  const [, set, ref] = store;
  const ver = useRef([0, 0, 0]);

  const patch = (pi: number, p: Partial<Peer>) => set(s => ({ peers: s.peers!.map((x, j) => (j === pi ? { ...x, ...p } : x)) }));

  async function recompute(pi: number) {
    const v = ++ver.current[pi];
    const c = await computeChain(ref.current.peers![pi].blocks);
    if (v === ver.current[pi]) patch(pi, { chain: c });
  }
  function edit(pi: number, i: number, data: string) {
    patch(pi, { blocks: ref.current.peers![pi].blocks.map((b, j) => (j === i ? { ...b, data } : b)) });
    recompute(pi);
  }
  async function remine(pi: number) {
    const p = ref.current.peers![pi];
    if (p.busy) return;
    patch(pi, { busy: true });
    const v = ++ver.current[pi];
    const r = await mineChain(p.blocks);
    // Edits made while mining win, as with a stale recompute
    if (v === ver.current[pi]) patch(pi, { blocks: r.blocks, chain: r.chain, busy: false });
    else patch(pi, { busy: false });
  }
  function sync(pi: number) {
    const peers = ref.current.peers!;
    const maj = majority(peers);
    const src = peers.find(p => tipOf(p) === maj);
    if (!src) return;
    ++ver.current[pi];
    patch(pi, { blocks: src.blocks.map(b => ({ ...b })), chain: src.chain.map(c => ({ ...c })) });
  }
  return { store, edit, remine, sync };
}
type S5 = ReturnType<typeof useStep5>;

export function Step5Network({ s5, ready }: { s5: S5; ready: boolean }) {
  const { t } = useI18n();
  const [{ peers }] = s5.store;
  if (!ready || !peers) return <Preparing />;
  const maj = majority(peers);

  return (
    <>
      <div className="peers">
        {peers.map((p, pi) => {
          const name = t("node", { c: "ABC"[pi] });
          const good = !!maj && tipOf(p) === maj;
          return (
            <div className={"peer" + (good ? "" : " bad")} key={pi}>
              <div className="mhead">
                <b>{name}</b>
                <Status ok={good}>{!maj ? t("noMajority") : good ? t("agree") : t("rejected")}</Status>
              </div>
              {p.blocks.map((b, i) => (
                <div className="prow" key={i}>
                  <span className="lbl">#{i + 1}</span>
                  <input
                    type="text"
                    value={b.data}
                    aria-label={`${name}, ${t("blockLbl", { i: i + 1 })}`}
                    autoComplete="off"
                    onChange={e => s5.edit(pi, i, e.target.value)}
                  />
                  <SeedWarn text={b.data} />
                  <span className={"hash sm" + (okHash(p.chain[i].hash) ? "" : " badh")}>
                    <Hx h={p.chain[i].hash} short={16} />
                  </span>
                </div>
              ))}
              <div className="lbl">{t("tip")}</div>
              <div className="hash sm">
                <Hx h={tipOf(p)} short={24} />
              </div>
              <div className="pbtns">
                <button type="button" className="ghost" onClick={() => s5.remine(pi)}>
                  {p.busy ? t("running") : t("remine")}
                </button>
                <button type="button" className="ghost" hidden={!maj || good} onClick={() => s5.sync(pi)}>
                  {t("sync")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="note">{t("s5n")}</p>
    </>
  );
}
