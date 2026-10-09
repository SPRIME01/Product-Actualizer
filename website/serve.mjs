#!/usr/bin/env bun
// Serves website/public locally:
//   bun website/serve.mjs up [--port N] [--no-open] [--hostname H]
//   bun website/serve.mjs down
//   bun website/serve.mjs status
//   bun website/serve.mjs open
//   bun website/serve.mjs serve [--port N] [--hostname H]
import fs from "node:fs";
import path from "node:path";

const websiteDir = path.resolve(import.meta.dir);
const root = path.resolve(websiteDir, "..");
const pub = path.join(websiteDir, "public");
const stateFile = path.join(websiteDir, ".server.json");
const logFile = path.join(websiteDir, ".server.log");
const scriptPath = path.join(websiteDir, "serve.mjs");

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

export function openBrowser(link) {
  const cands = process.platform === "darwin"
    ? [["open"]]
    : process.platform === "win32"
    ? [["cmd", "/c", "start", ""]]
    : [["wslview"], ["xdg-open"], ["explorer.exe"]];
  for (const c of cands) {
    if (!Bun.which(c[0])) continue;
    try {
      Bun.spawn([...c, link], { stdout: "ignore", stderr: "ignore", stdin: "ignore" }).unref();
      return true;
    } catch {}
  }
  return false;
}

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) opt[k] = true;
      else { i++; opt[k] = next; }
    } else pos.push(a);
  }
  return { pos, opt };
}

function serverInfo() {
  const s = readJson(stateFile);
  if (!s || !alive(s.pid)) return null;
  return s;
}

function createFetchHandler(pubDir) {
  return function fetch(req) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(pubDir, p);
    if (!f.startsWith(pubDir)) {
      return new Response("Forbidden", { status: 403 });
    }
    if (fs.existsSync(f)) {
      const stat = fs.statSync(f);
      if (stat.isDirectory()) {
        const idx = path.join(f, "index.html");
        if (fs.existsSync(idx) && fs.statSync(idx).isFile()) {
          return Response.redirect(`${url.pathname}/${url.search}`, 302);
        }
      } else if (stat.isFile()) {
        const headers = new Headers();
        if (f.endsWith(".mjs") || f.endsWith(".js")) {
          headers.set("content-type", "text/javascript; charset=utf-8");
        } else if (f.endsWith(".css")) {
          headers.set("content-type", "text/css; charset=utf-8");
        } else if (f.endsWith(".html")) {
          headers.set("content-type", "text/html; charset=utf-8");
        } else if (f.endsWith(".json")) {
          headers.set("content-type", "application/json; charset=utf-8");
        } else if (f.endsWith(".svg")) {
          headers.set("content-type", "image/svg+xml");
        } else if (f.endsWith(".woff2")) {
          headers.set("content-type", "font/woff2");
        }
        headers.set("cache-control", "no-cache");
        return new Response(Bun.file(f), { headers });
      }
    }
    const notFound = path.join(pubDir, "404.html");
    if (fs.existsSync(notFound) && fs.statSync(notFound).isFile()) {
      return new Response(Bun.file(notFound), {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response("not found", { status: 404 });
  };
}

async function main(argv) {
  const { pos, opt } = parseArgs(argv);
  const sub = pos[0] ?? "status";

  if (sub === "up") {
    const cur = serverInfo();
    if (cur) {
      if (!opt["no-open"]) openBrowser(cur.url);
      console.log(`website already up: ${cur.url}${opt["no-open"] ? "" : " (opened in your browser)"}`);
      return 0;
    }
    if (!fs.existsSync(pub) || !fs.existsSync(path.join(pub, "index.html"))) {
      console.error(`website public directory missing or index.html not found at ${pub}`);
      return 1;
    }
    const log = fs.openSync(logFile, "a");
    const childArgs = [
      process.execPath,
      scriptPath,
      "serve",
      ...(opt.port && opt.port !== true ? ["--port", String(opt.port)] : []),
      ...(opt.hostname && opt.hostname !== true ? ["--hostname", String(opt.hostname)] : []),
    ];
    const child = Bun.spawn(childArgs, { cwd: root, stdin: "ignore", stdout: "pipe", stderr: log, detached: true });
    const reader = child.stdout.getReader();
    const first = await Promise.race([
      reader.read().then((r) => new TextDecoder().decode(r.value ?? new Uint8Array())),
      Bun.sleep(5000).then(() => ""),
    ]);
    reader.releaseLock();
    child.unref();

    const m = /^URL (\S+)/m.exec(first.trim());
    if (!m) {
      console.error(`website did not start; see ${logFile}`);
      return 1;
    }
    const url = m[1];
    if (!opt["no-open"]) openBrowser(url);
    console.log(`website up: ${url}${opt["no-open"] ? "" : " (opened in your browser)"}`);
    return 0;
  }

  if (sub === "down") {
    const s = readJson(stateFile);
    if (!s || !alive(s.pid)) {
      try { fs.unlinkSync(stateFile); } catch {}
      console.log("website is not running");
      return 0;
    }
    process.kill(s.pid, "SIGTERM");
    for (let i = 0; i < 30 && alive(s.pid); i++) await Bun.sleep(100);
    if (alive(s.pid)) {
      process.kill(s.pid, "SIGKILL");
    }
    try { fs.unlinkSync(stateFile); } catch {}
    console.log("website down");
    return 0;
  }

  if (sub === "status") {
    const s = serverInfo();
    if (s) {
      console.log(`website up: ${s.url} (pid ${s.pid})`);
      return 0;
    }
    console.log("website is down");
    return 0;
  }

  if (sub === "open") {
    const s = serverInfo();
    if (!s) {
      console.error("website is not running: just website-up");
      return 1;
    }
    openBrowser(s.url);
    console.log(`opened in your browser: ${s.url}`);
    return 0;
  }

  if (sub === "serve") {
    const hostname = opt.hostname && opt.hostname !== true ? opt.hostname : "127.0.0.1";
    const explicitPort = opt.port && opt.port !== true ? Number(opt.port) : null;
    const preferredPort = explicitPort ?? Number(process.env.PORT || 3000);
    const fetchHandler = createFetchHandler(pub);

    let server;
    try {
      server = Bun.serve({
        port: preferredPort,
        hostname,
        development: false,
        fetch: fetchHandler,
      });
    } catch (err) {
      if (explicitPort === null && preferredPort !== 0) {
        server = Bun.serve({
          port: 0,
          hostname,
          development: false,
          fetch: fetchHandler,
        });
      } else {
        throw err;
      }
    }

    const url = `http://${hostname}:${server.port}`;
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ port: server.port, pid: process.pid, url, startedAt: new Date().toISOString() })
    );

    const cleanup = () => {
      try { server.stop(true); } catch {}
      try {
        if (readJson(stateFile)?.pid === process.pid) fs.unlinkSync(stateFile);
      } catch {}
    };

    process.on("SIGTERM", () => { cleanup(); process.exit(0); });
    process.on("SIGINT", () => { cleanup(); process.exit(0); });
    process.on("exit", () => { cleanup(); });

    console.log(`URL ${url}`);
    await new Promise(() => {});
    return 0;
  }

  console.error("usage: bun website/serve.mjs up|down|status|open|serve [--port n] [--no-open]");
  return 2;
}

main(process.argv.slice(2)).then((c) => process.exit(c ?? 0)).catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
