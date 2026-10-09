import { $, h } from "./shared.mjs";
import "./motion.mjs";
// theme toggle: a real button, remembered per viewer when storage allows
const root = document.documentElement;
const dark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
const btn = $("#theme");
const label = () => { btn.textContent = dark() ? "Light" : "Dark"; btn.setAttribute("aria-label", dark() ? "Switch to light theme" : "Switch to dark theme"); };
btn.addEventListener("click", () => { const next = dark() ? "light" : "dark"; root.dataset.theme = next; try { localStorage.setItem("pa-theme", next); } catch { /* storage unavailable */ } label(); });
label();
for (const [sel, mod] of [["#ledger-app", "./ledger.mjs"], ["#lab-app", "./lab.mjs"], ["#waves-app", "./waves.mjs"], ["#lifecycle-app", "./lifecycle.mjs"]]) {
  const el = $(sel); if (!el) continue;
  const start = () => import(mod).then((m) => m.mount(el)).catch((e) => el.append(h("p", { class: "result" }, `Could not start this demo: ${e.message}`)));
  // the hero demo starts at once; the others start when they are about to scroll into view, so the first load stays small
  if (sel === "#ledger-app" || !("IntersectionObserver" in window)) start();
  else new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); start(); } }, { rootMargin: "800px" }).observe(el);
}
