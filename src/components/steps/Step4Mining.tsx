import { useI18n } from "../../i18n";
import { findNonce } from "../../lib/hash";
import { useStore } from "../../lib/useStore";

interface Row {
  d: number;
  tries: number | null;
  ms: number | null;
}

export function useStep4() {
  const store = useStore(() => ({
    rows: [1, 2, 3, 4].map((d): Row => ({ d, tries: null, ms: null })),
    running: false,
    done: false,
  }));
  const [, set, ref] = store;

  async function race() {
    if (ref.current.running) return;
    set(s => ({ running: true, done: false, rows: s.rows.map(r => ({ ...r, tries: null, ms: null })) }));
    const salt = Math.random().toString(36).slice(2);
    for (const { d } of ref.current.rows) {
      const r = await findNonce({ prefix: `race|${salt}|${d}|`, suffix: "", zeros: d, maxMs: 30000 }).result;
      const found = r.status === "found";
      set(s => ({ rows: s.rows.map(x => (x.d === d ? { d, tries: found ? r.tries : null, ms: found ? r.ms : null } : x)) }));
    }
    set({ running: false, done: true });
  }
  return { store, race };
}
type S4 = ReturnType<typeof useStep4>;

export function Step4Mining({ s4 }: { s4: S4 }) {
  const { t, fmt } = useI18n();
  const [s] = s4.store;
  return (
    <>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("thZeros")}</th>
              <th>{t("thExp")}</th>
              <th>{t("thYour")}</th>
              <th>{t("thTime")}</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map(r => (
              <tr key={r.d}>
                <td>{r.d}</td>
                <td>~{fmt(16 ** r.d)}</td>
                <td>{r.tries == null ? "—" : fmt(r.tries)}</td>
                <td>{r.ms == null ? "—" : (r.ms / 1000).toFixed(2) + "s"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <button type="button" className="primary" disabled={s.running} onClick={s4.race}>
          {s.running ? t("running") : t("runRace")}
        </button>
      </div>
      <p className="note">{s.done ? t("raceDone") : ""}</p>
      <p className="note">{t("s4n")}</p>
    </>
  );
}
