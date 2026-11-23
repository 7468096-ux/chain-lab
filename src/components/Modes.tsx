import { useI18n } from "../i18n";

export function Modes() {
  const { t } = useI18n();
  return (
    <div className="modes">
      <a className="mode" href="#lab">
        <h3>
          <span>{t("mode1")}</span>
          <span className="pill live">{t("live")}</span>
        </h3>
        <p>{t("mode1d")}</p>
      </a>
      <a className="mode" href="#decode">
        <h3>
          <span>{t("mode2")}</span>
          <span className="pill live">{t("live")}</span>
        </h3>
        <p>{t("mode2d")}</p>
      </a>
    </div>
  );
}
