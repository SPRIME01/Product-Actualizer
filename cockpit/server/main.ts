// The cockpit daemon. Started by `actualize cockpit up` (script or compiled) as `actualize cockpit serve --cwd <project>`.
// Prints exactly one line to stdout (`URL <human link>`) for the launching process, then logs only to the log file.
import index from "../web/index.html";
import { serveCockpit, openBrowser } from "./serve";

export function runDaemon(opt: Record<string, any>, cwd: string) {
  const s = serveCockpit({ cwd: opt.cwd && opt.cwd !== true ? opt.cwd : cwd, port: opt.port && opt.port !== true ? Number(opt.port) : 0, index });
  process.stdout.write(`URL ${s.humanUrl}\n`);
  if (!opt["no-open"]) openBrowser(s.humanUrl);
  const bye = () => { s.stop(); process.exit(0); };
  process.on("SIGTERM", bye); process.on("SIGINT", bye);
  console.error(`[cockpit] serving ${s.url} for ${s.cockpit.cwd}`);
  return s;
}
