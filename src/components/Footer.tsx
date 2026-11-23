import { useI18n } from "../i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer>
      <div className="wrap">
        <p>{t("f1")}</p>
        <p>{t("f2")}</p>
      </div>
    </footer>
  );
}
