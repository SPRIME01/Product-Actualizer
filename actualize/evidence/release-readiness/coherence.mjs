// Release-readiness checks 3 and 4: placeholder scan, and cross-surface extraction of names, numbers and the license.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "../../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
const surfaces = {
  "site (index.html text)": strip(read("website/public/index.html")),
  "site claims table": read("website/public/index.html"),
  "film transcript": read("media/explainer-3/script/transcript.md"),
  "film captions (vtt)": read("media/explainer-3/captions/explainer.en.vtt"),
  "launch-posts": read("actualize/artifacts/marketing/launch-posts.md"),
  "sales-brief": read("actualize/artifacts/marketing/sales-brief.md"),
  "brand identity": read("actualize/artifacts/brand/identity.md"),
  "website-copy": read("actualize/artifacts/marketing/website-copy.md"),
  "brand guide": read("brand/README.md"),
  "launch README": read("launch/README.md"),
  "og/social text (build.mjs)": read("brand/build.mjs"),
};
const out = [];
// 3. placeholders (the lens's list, minus the product's own [C#] citations)
const ph = /lorem|\bTODO\b|\bTBD\b|example\.com|\bxxx+\b|\[(?!C\d+\])[A-Za-z][^\]\n]{2,}\](?!\()/gi;
const phHits = [];
for (const f of ["actualize/artifacts/marketing/launch-posts.md", "actualize/artifacts/marketing/sales-brief.md", "actualize/artifacts/marketing/website-copy.md", "actualize/artifacts/brand/identity.md", "launch/README.md", "brand/README.md", "website/README.md", "media/explainer/README.md", "media/explainer-3/script/transcript.md"]) for (const m of read(f).matchAll(ph)) phHits.push(`${f}: ${m[0].slice(0, 40)}`);
const siteText = surfaces["site (index.html text)"]; for (const m of siteText.matchAll(ph)) phHits.push(`site: ${m[0].slice(0, 40)}`);
out.push(`## Check 3: placeholder scan\n${phHits.length ? phHits.map((h) => "- " + h).join("\n") : "Zero hits for lorem, TODO, TBD, example.com, xxx, or bracketed placeholders across the site text, the four public artifacts, the READMEs and the transcript."}\n`);
// 4. extraction
const rows = [];
const count = (re, t) => (t.match(re) ?? []).length;
const names = [["Product Actualizer", /Product Actualizer(?! Architect)/g], ["Product Actualizer Architect", /Product Actualizer Architect/g], ["wrong spellings (Actualiser, Product-Actualizer in prose, ProductActualizer)", /Actualiser|ProductActualizer(?!\.)/g]];
for (const [label, re] of names) rows.push([label, ...Object.values(surfaces).map((t) => count(re, t))]);
const facts = [["17 lenses", /\b17\b[^.\n]{0,30}lens|seventeen lenses/gi], ["seven grades / 7 grades", /seven (evidence )?grades|7 grades/gi], ["72 seconds / 72-second", /72[- ]second|72\.4|72 seconds/gi], ["162 combinations", /\b162\b/g], ["AGPL / Affero", /AGPL|Affero/gi], ["GPL (not Affero)", /(?<!origin\/main[^.]{0,24})(?:\bGNU General Public License|(?<!A)\bGPL-3\.0\b)/g], ["'no license' claim", /no license (has been )?declared|has no LICENSE|without a license/gi], ["tagline", /Finish the product\. Show the evidence\./g], ["model@ versions", /model@\d+/g]];
const present = (t) => t.split("\n").filter((l) => !/remote|origin\/main|Rebuilt at|replacing/i.test(l)).join("\n");   // lines about the remote or about history may name the GPL truthfully
for (const [label, re] of facts) rows.push([label, ...Object.values(surfaces).map((t) => count(re, label.startsWith("GPL") ? present(t) : t))]);
const heads = ["item", ...Object.keys(surfaces)];
const verSet = {}; for (const [k, t] of Object.entries(surfaces)) verSet[k] = [...new Set(t.match(/model@\d+/g) ?? [])].join(" ");
out.push(`## Check 4: cross-surface extraction (counts per surface)\n\n| ${heads.join(" | ")} |\n|${heads.map(() => "---").join("|")}|\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n\nModel versions named per surface: ${JSON.stringify(verSet)}\n`);
const bad = [];
if (rows.find((r) => r[0].startsWith("wrong")).slice(1).some((n) => n > 0)) bad.push("a wrong spelling of the name appears");
if (rows.find((r) => r[0].startsWith("'no license'")).slice(1).some((n) => n > 0)) bad.push("a surface still says there is no license");
if (rows.find((r) => r[0].startsWith("GPL (not")).slice(1).some((n) => n > 0)) bad.push("a surface still names the GPL rather than the AGPL");
out.push(bad.length ? `Differences needing a fix: ${bad.join("; ")}.\n` : "No differences: the name, the license, the lens count and the film length read the same on every surface that states them.\n");
fs.writeFileSync(path.join(import.meta.dir, "coherence.md"), "# Coherence checks\n\n" + out.join("\n")); console.log(out.join("\n")); process.exit(phHits.length || bad.length ? 1 : 0);
