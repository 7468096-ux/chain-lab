import { useI18n, type Lang } from "../i18n";

export function Header({ onLang }: { onLang: (l: Lang) => void }) {
  const { t, lang } = useI18n();
  return (
    <header>
      <div className="bar">
        <div className="brand">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <rect x="1" y="11" width="10" height="12" rx="2" fill="none" stroke="#e3b341" strokeWidth="2" />
            <rect x="12" y="11" width="10" height="12" rx="2" fill="none" stroke="#e3b341" strokeWidth="2" />
            <rect x="23" y="11" width="10" height="12" rx="2" fill="#e3b341" />
          </svg>
          <div>
            <b>{t("brand")}</b>
            <small>{t("tagline")}</small>
          </div>
        </div>
        <div className="bar-right">
          <a className="ghost" href="#course">
            {t("howBtn")}
          </a>
          <div className="lang" role="group" aria-label="Language">
            {(["en", "ru"] as const).map(l => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => onLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
