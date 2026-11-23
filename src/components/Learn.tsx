import { useI18n, type Key } from "../i18n";

const ITEMS: [string, Key, Key][] = [
  ["SHA-256", "l1", "l1d"],
  ["prev → hash", "l2", "l2d"],
  ["PoW · PoS", "l3", "l3d"],
  ["ERC-20 · ERC-721", "l4", "l4d"],
];

export function Learn() {
  const { t } = useI18n();
  return (
    <section>
      <h2>{t("learnH")}</h2>
      <p className="sub">{t("learnSub")}</p>
      <div className="learn">
        {ITEMS.map(([code, h, d]) => (
          <article key={h}>
            <div className="code">{code}</div>
            <h3>{t(h)}</h3>
            <p>{t(d)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
