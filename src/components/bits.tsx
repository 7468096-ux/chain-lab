import { useI18n } from "../i18n";
import { looksLikeSeed } from "../lib/seed";

/** Hash with leading zeros highlighted. `short` cuts it to that many characters plus "…". */
export function Hx({ h, short }: { h: string | null | undefined; short?: number }) {
  if (!h) return <>…</>;
  let z = 0;
  while (z < h.length && h[z] === "0") z++;
  const s = short ? h.slice(0, short) : h;
  const zz = Math.min(z, s.length);
  return (
    <>
      <span className="z">{s.slice(0, zz)}</span>
      {s.slice(zz)}
      {short ? "…" : ""}
    </>
  );
}

/** VALID / INVALID pill. */
export function Status({ ok, children }: { ok: boolean; children?: React.ReactNode }) {
  const { t } = useI18n();
  return <span className={"status " + (ok ? "valid" : "invalid")}>{children ?? (ok ? t("valid") : t("invalid"))}</span>;
}

/** Warning shown under any text field whose value looks like a wallet seed phrase. */
export function SeedWarn({ text }: { text: string }) {
  const { t } = useI18n();
  if (!looksLikeSeed(text)) return null;
  return (
    <div className="warn show" role="alert">
      {t("seedWarn")}
    </div>
  );
}

export function Preparing() {
  const { t } = useI18n();
  return <p className="note">{t("preparing")}</p>;
}
