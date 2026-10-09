// Micro motion. Every movement here reports something the page is saying: scrolling closes the mark's frame (the product is being finished),
// the board's cards are dragged to Done by an agent, answers land in the comparison one after the other, a refusal nudges once.
// Nothing runs under prefers-reduced-motion, and without JavaScript every element is simply in its final state.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// 1. The finish line: a hairline under the header that is solid behind you and dashed ahead, and the mark's dashed frame closing with it.
const bar = $$(".progress i")[0], dashed = $$(".lockup path")[0];
const GAP = 6;
let queued = false;
const ghost = $$(".ghost")[0], ghostDash = ghost?.querySelector(".gm-dashed");
function progress() {
  queued = false;
  if (ghost) { const k = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.75))); ghostDash.setAttribute("stroke-dasharray", `14 ${(6 * (1 - k)).toFixed(2)}`); ghost.style.setProperty("--gb", (0.7 + 0.3 * k).toFixed(3)); }
  const max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
  if (dashed && !reduced) dashed.setAttribute("stroke-dasharray", `14 ${(GAP * (1 - Math.min(1, p * 1.25))).toFixed(2)}`);
}
if (!reduced) { addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(progress); } }, { passive: true }); addEventListener("resize", progress); progress(); }
else if (bar) bar.style.transform = "scaleX(0)";

// 2. Which section you are in, shown in the nav.
const links = new Map($$(".top nav a").map((a) => [a.getAttribute("href").slice(1), a]));
if ("IntersectionObserver" in window) {
  const spy = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { links.forEach((a) => a.removeAttribute("aria-current")); links.get(e.target.id)?.setAttribute("aria-current", "true"); } }, { rootMargin: "-40% 0px -55% 0px" });
  links.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
}

// 3. Reveal on scroll, staggered by position among siblings, and the one-off scenes (the board, the comparison).
if (!reduced && "IntersectionObserver" in window) {
  root.classList.add("js-motion");
  const targets = $$(".block > .label, .block > .lead, .block > .prose, .block > .fine, .quotes figure, .rules li, .groups > div, .split > div, .figures figure, .cmds > div, .walk tbody tr, .cmp tbody tr, .aside");
  targets.forEach((el) => { el.classList.add("rv"); const sib = [...(el.parentElement?.children ?? [])].filter((c) => c.classList.contains("rv") || targets.includes(c)); el.style.setProperty("--d", `${Math.min(sib.indexOf(el), 5) * 70}ms`); });
  const io = new IntersectionObserver((es, o) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); o.unobserve(e.target); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
  const board = $$(".board")[0];
  if (board) { board.classList.add("pre"); new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); requestAnimationFrame(() => requestAnimationFrame(() => board.classList.remove("pre"))); } }, { threshold: 0.5 }).observe(board); }
  // the walk's verdict lands after its rows
  const verdict = $$(".verdict-line")[0]; if (verdict) { verdict.classList.add("rv"); verdict.style.setProperty("--d", "420ms"); io.observe(verdict); }
}

// 4. A soft light follows the pointer across the instrument panels, so the panel you are touching reads as live.
if (!reduced && matchMedia("(hover: hover)").matches) {
  $$(".instrument").forEach((p) => p.addEventListener("pointermove", (e) => { const r = p.getBoundingClientRect(); p.style.setProperty("--mx", `${e.clientX - r.left}px`); p.style.setProperty("--my", `${e.clientY - r.top}px`); }, { passive: true }));
}
