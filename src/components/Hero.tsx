import { useI18n } from "../i18n";

export function Hero() {
  const { t } = useI18n();
  return (
    <div className="hero">
      <div className="eyebrow">{t("eyebrow")}</div>
      {/* h1 holds a trusted <em> from our own dictionary */}
      <h1 dangerouslySetInnerHTML={{ __html: t("h1") }} />
      <p className="lede">{t("lede")}</p>
    </div>
  );
}
