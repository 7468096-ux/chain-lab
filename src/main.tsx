import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { langFromPath, readSavedLang } from "./lang";
import "./styles.css";

const pageLang = langFromPath(location.pathname);
const saved = readSavedLang();

// "/" answers with a 302 chosen by Accept-Language. If the visitor picked the other language
// on an earlier visit, honour that choice — but only after that redirect, never on a shared /en/ or /ru/ link.
const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
const cameFromRoot = !!navEntry && navEntry.redirectCount > 0;

if (cameFromRoot && saved && pageLang && saved !== pageLang) {
  location.replace(`/${saved}/${location.hash}`);
} else {
  const root = document.getElementById("root")!;
  // Dev server serves an empty shell at any path; production pages are prerendered and get hydrated.
  const initialLang = pageLang ?? saved ?? ((navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "en");
  const app = (
    <StrictMode>
      <App initialLang={initialLang} />
    </StrictMode>
  );
  if (root.firstElementChild) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
