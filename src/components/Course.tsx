import { useEffect, useRef, useState } from "react";
import { useI18n, type Key } from "../i18n";
import { mineChain, sha256 } from "../lib/hash";
import { genKeys } from "../lib/keys";
import { Step1Hash, useStep1 } from "./steps/Step1Hash";
import { Step2Block, useStep2 } from "./steps/Step2Block";
import { Step3Chain, useStep3 } from "./steps/Step3Chain";
import { Step4Mining, useStep4 } from "./steps/Step4Mining";
import { Step5Network, useStep5 } from "./steps/Step5Network";
import { Step6Keys, useStep6 } from "./steps/Step6Keys";
import { Step7Transactions, USERS, useStep7 } from "./steps/Step7Transactions";
import { Step8Tokens, useStep8 } from "./steps/Step8Tokens";

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8];

export function Course() {
  const { t } = useI18n();
  const [cur, setCur] = useState(1);
  const [ready, setReady] = useState(false);

  // Step state lives here so it survives switching steps and languages
  const s1 = useStep1();
  const s2 = useStep2();
  const s3 = useStep3();
  const s4 = useStep4();
  const s5 = useStep5();
  const s6 = useStep6();
  const s7 = useStep7();
  const s8 = useStep8();

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      s6.store[1]({ me: await genKeys() });
      const keys: Record<string, Awaited<ReturnType<typeof genKeys>>> = {};
      for (const u of USERS) keys[u] = await genKeys();
      s7.store[1]({ keys });
      await s8.claim("satoshi", "Alice");
      await s8.claim("moon", "Bob");
      s8.store[1]({ msg: null });
      s2[1]({ prev: await sha256("genesis") });
      const { blocks, chain } = await mineChain(s3.store[2].current.blocks);
      s3.store[1]({ blocks, chain, pristine: blocks.map(b => ({ ...b })) });
      s5.store[1]({
        peers: ["A", "B", "C"].map(() => ({
          blocks: blocks.slice(0, 3).map(b => ({ ...b })),
          chain: chain.slice(0, 3).map(c => ({ ...c })),
        })),
      });
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scene = (() => {
    switch (cur) {
      case 1: return <Step1Hash store={s1} />;
      case 2: return <Step2Block store={s2} />;
      case 3: return <Step3Chain s3={s3} ready={ready} />;
      case 4: return <Step4Mining s4={s4} />;
      case 5: return <Step5Network s5={s5} ready={ready} />;
      case 6: return <Step6Keys s6={s6} ready={ready} />;
      case 7: return <Step7Transactions s7={s7} ready={ready} />;
      default: return <Step8Tokens s8={s8} ready={ready} />;
    }
  })();

  return (
    <section id="course">
      <h2>{t("courseH")}</h2>
      <p className="sub">{t("courseSub2")}</p>
      <div className="course">
        <nav className="stepnav" aria-label="Course steps">
          {STEPS.map(i => (
            <button key={i} type="button" aria-current={i === cur ? "step" : undefined} onClick={() => setCur(i)}>
              <span className="n">0{i}</span>
              <b>{t(("c" + i) as Key)}</b>
              <small>{t(("c" + i + "d") as Key)}</small>
            </button>
          ))}
        </nav>
        <div className="panel">
          <div className="eyebrow">{t("stepOf", { i: cur })}</div>
          <h3>{t(("s" + cur + "t") as Key)}</h3>
          <p className="txt">{t(("s" + cur + "x") as Key)}</p>
          <div className="scene">{scene}</div>
          <div className="panel-nav">
            <button type="button" className="ghost" disabled={cur === 1} onClick={() => cur > 1 && setCur(cur - 1)}>
              {t("back")}
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (cur < 8) {
                  setCur(cur + 1);
                  document.getElementById("course")?.scrollIntoView({ block: "start" });
                } else document.getElementById("lab")?.scrollIntoView({ block: "start" });
              }}
            >
              {cur === 8 ? t("finish") : t("next")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
