// Bun's per-test default is 5 s, which a cold system Chrome, a cold page bundle, or a loaded machine can exceed. `bunfig.toml` has no timeout
// key in Bun 1.4 (it is ignored), so the default is raised here, once, for every test file.
import { setDefaultTimeout } from "bun:test";
setDefaultTimeout(30000);
