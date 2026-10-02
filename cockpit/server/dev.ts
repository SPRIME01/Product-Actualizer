// `bun run dev`: the cockpit with hot reload of the UI against the current project. Prints the human link.
import index from "../web/index.html";
import { serveCockpit, openBrowser } from "./serve";

const s = serveCockpit({ cwd: process.env.COCKPIT_CWD ?? process.cwd(), port: Number(process.env.COCKPIT_PORT ?? 0), index, dev: true });
console.log(`cockpit (dev, hot reload): ${s.humanUrl}`);
if (!process.env.NO_OPEN) openBrowser(s.humanUrl);
