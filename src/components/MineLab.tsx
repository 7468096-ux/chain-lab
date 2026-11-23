import { useEffect, useRef, useState } from "react";
import { useI18n, type Msg } from "../i18n";
import { findNonce, sha256, ZERO_HASH, type FindJob } from "../lib/hash";
import { Hx, SeedWarn, Status } from "./bits";

const LIMIT_MS = 20000;
const payload = (n: number, data: string) => `1|${n}|${data}|${ZERO_HASH}`;

export function MineLab() {
  const { t, fmt } = useI18n();
  const [data, setData] = useState("Alice pays Bob 5 coins");
  const [nonce, setNonce] = useState("0");
  const [difficulty, setDifficulty] = useState(3);
  const [hash, setHash] = useState("");
  const [mining, setMining] = useState(false);
  const [stats, setStats] = useState({ tries: 0, ms: 0 });
  const [msg, setMsg] = useState<Msg | null>(null);

  const ver = useRef(0);
  const job = useRef<FindJob | null>(null);
  const prog = useRef({ n: 0, tries: 0, ms: 0 });
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;
  const hashRef = useRef(hash);
  hashRef.current = hash;

  const isValid = (h: string) => h.startsWith("0".repeat(diffRef.current));

  async function update(d: string, n: number, fromEdit: boolean) {
    const v = ++ver.current;
    const h = await sha256(payload(n, d));
    if (v !== ver.current) return;
    setHash(h);
    if (fromEdit && !isValid(h)) setMsg({ k: "edited" });
  }

  useEffect(() => {
    update(data, 0, false);
    return () => job.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showStats(tries: number, ms: number) {
    prog.current.tries = tries;
    prog.current.ms = ms;
    setStats({ tries, ms });
  }

  function startJob(start: number, triesBase: number, msBase: number) {
    const d = data;
    prog.current = { n: start, tries: triesBase, ms: msBase };
    const j = findNonce(
      { prefix: "1|", suffix: `|${d}|${ZERO_HASH}`, zeros: diffRef.current, start, maxMs: LIMIT_MS - msBase },
      p => {
        if (job.current !== j) return;
        prog.current.n = p.n;
        setNonce(String(p.n));
        showStats(triesBase + p.tries, msBase + p.ms);
      },
    );
    job.current = j;
    j.result.then(r => {
      if (job.current !== j) return; // stopped or restarted by the user
      job.current = null;
      setMining(false);
      const tries = triesBase + r.tries;
      showStats(tries, msBase + r.ms);
      setNonce(String(r.n));
      if (r.status === "found") {
        ++ver.current;
        setHash(r.hash);
        setMsg({ k: "found", a: { n: r.n, t: tries } });
      } else {
        update(d, r.n, false);
        setMsg({ k: "timeout" });
      }
    });
  }

  /** Stops at once. Returns the last nonce reached. */
  function halt(): number {
    const j = job.current;
    job.current = null;
    j?.stop();
    setMining(false);
    return prog.current.n;
  }

  function mine() {
    setMsg(null);
    setMining(true);
    let n = Number(nonce) || 0;
    if (isValid(hashRef.current)) n++;
    startJob(n, 0, 0);
  }

  function stopByUser() {
    const n = halt();
    setNonce(String(n));
    update(data, n, false);
    setMsg({ k: "stopped" });
  }

  function chooseDifficulty(d: number) {
    setDifficulty(d);
    diffRef.current = d;
    // Like the prototype, a running search continues with the new target.
    if (job.current) {
      const { n, tries, ms } = prog.current;
      halt();
      setMining(true);
      startJob(n, tries, ms);
    }
  }

  const ok = !!hash && isValid(hash);
  const sec = stats.ms / 1000;
  const msgText = msg ? t(msg.k, msg.a && { ...msg.a, t: fmt(Number(msg.a.t)) }) : "";

  return (
    <section id="lab">
      <h2>{t("labH")}</h2>
      <p className="sub">{t("labSub")}</p>

      <div className="lab">
        <div className={"block" + (ok ? " valid" : "")}>
          <div className="block-head">
            <b>{t("blockN")}</b>
            {hash ? <Status ok={ok} /> : <Status ok={false} />}
          </div>
          <div className="row">
            <label htmlFor="data">{t("fData")}</label>
            <div className="v">
              <textarea
                id="data"
                rows={3}
                value={data}
                onChange={e => {
                  const d = e.target.value;
                  setData(d);
                  if (job.current) halt();
                  update(d, Number(nonce) || 0, true);
                }}
              />
              <SeedWarn text={data} />
            </div>
          </div>
          <div className="row">
            <label htmlFor="nonce">{t("fNonce")}</label>
            <div className="v">
              <input
                id="nonce"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={nonce}
                onChange={e => {
                  setNonce(e.target.value);
                  if (job.current) halt();
                  update(data, Number(e.target.value) || 0, false);
                }}
              />
            </div>
          </div>
          <div className="row">
            <div className="k">{t("fPrev")}</div>
            <div className="v">
              <div className="hash prev">{ZERO_HASH}</div>
            </div>
          </div>
          <div className="row">
            <div className="k">{t("fHash")}</div>
            <div className="v">
              <div className="hash" aria-live="polite">
                <Hx h={hash} />
              </div>
            </div>
          </div>
        </div>

        <div className="side">
          <div className="card">
            <h4>{t("diffH")}</h4>
            <div className="diff">
              {[1, 2, 3, 4].map(d => (
                <button key={d} type="button" aria-pressed={difficulty === d} onClick={() => chooseDifficulty(d)}>
                  {d}
                </button>
              ))}
            </div>
            <p className="note">{t("diffNote")}</p>
            <button type="button" className={"primary" + (mining ? " stop" : "")} onClick={() => (mining ? stopByUser() : mine())}>
              {mining ? t("stopBtn") : t("mineBtn")}
            </button>
            <div className="stats">
              <div className="stat">
                <span>{t("sTries")}</span>
                <b>{fmt(stats.tries)}</b>
              </div>
              <div className="stat">
                <span>{t("sSpeed")}</span>
                <b>{fmt(stats.tries ? Math.round(stats.tries / Math.max(sec, 0.001)) : 0)}</b>
              </div>
              <div className="stat">
                <span>{t("sTime")}</span>
                <b>{sec.toFixed(1)}s</b>
              </div>
            </div>
            <p className="note" aria-live="polite">
              {msgText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
