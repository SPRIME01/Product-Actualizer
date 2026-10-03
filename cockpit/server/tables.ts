// Markdown tables as header + rows. Shared by the source layer and the learning projections.
export function markdownTables(text: string): { head: string[]; rows: string[][]; line: number }[] {
  const lines = text.split("\n"), out: { head: string[]; rows: string[][]; line: number }[] = [];
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*\|/.test(lines[i]) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = cells(lines[i]); const rows: string[][] = []; let j = i + 2;
      while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(cells(lines[j])); j++; }
      out.push({ head, rows, line: i + 1 }); i = j;
    }
  }
  return out;
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "col";
