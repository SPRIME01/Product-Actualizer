// HTTP + WebSocket front for the cockpit core, on Bun.serve alone: static SPA via HTML import, routes, per-socket pub/sub, no framework.
//
// Roles (the boundary that keeps UI state from becoming a second decision system):
//   human  holds the token printed/opened at start. Its WebSocket may send human.* operations (answers, rulings, confirmations, layout).
//   agent  holds the token in .cockpit/agent.token. It may call tools and typed agent actions, and read; it can never send human.*.
// Both tokens are random per start; every request must also come from a loopback Host so a web page cannot reach this server by DNS rebinding.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Cockpit } from "./core";
import { toolSchemas, TOOLS } from "../protocol/tools";
import { HUMAN_OPS } from "../protocol/actions";

export type ServeOpts = { cwd: string; port?: number; hostname?: string; index?: any; dbFile?: string; dev?: boolean };
const token = () => crypto.randomBytes(18).toString("base64url");
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
const LOOPBACK_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
const MAX_BODY = 1_000_000;
const IMAGES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };

export function serveCockpit(o: ServeOpts) {
  const cockpit = new Cockpit(o.cwd, { dbFile: o.dbFile });
  const humanToken = token(), agentToken = token();
  const dir = path.join(cockpit.run.dir, ".cockpit");
  fs.mkdirSync(dir, { recursive: true });
  const tokenFile = path.join(dir, "agent.token");
  fs.writeFileSync(tokenFile, agentToken, { mode: 0o600 });

  const roleOf = (req: Request, url: URL): "human" | "agent" | null => {
    const t = req.headers.get("x-cockpit-token") ?? url.searchParams.get("t") ?? (req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
    return t === humanToken ? "human" : t === agentToken ? "agent" : null;
  };
  // Host stops DNS rebinding; Origin (when a browser sends one) stops another local web page from driving this one.
  const guard = (req: Request) => {
    if (!LOOPBACK.test(req.headers.get("host") ?? "")) return json({ ok: false, code: "FORBIDDEN", message: "loopback only" }, 403);
    const origin = req.headers.get("origin");
    if (origin && !LOOPBACK_ORIGIN.test(origin)) return json({ ok: false, code: "FORBIDDEN", message: "cross-origin request" }, 403);
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return json({ ok: false, code: "SCHEMA", message: "body too large" }, 413);
    return null;
  };

  let url0 = "";
  const sockets = new Set<import("bun").ServerWebSocket<any>>();
  const server = Bun.serve({
    port: o.port ?? 0, hostname: o.hostname ?? "127.0.0.1", development: o.dev ?? false,
    routes: {
      ...(o.index ? { "/": o.index } : { "/": () => new Response("cockpit UI not built: run `bun run build` or `bun run dev`", { status: 503 }) }),
      "/health": () => json({ ok: true }),
    },
    async fetch(req, srv) {
      const url = new URL(req.url);
      const g = guard(req); if (g) return g;
      if (url.pathname === "/ws") {
        if (roleOf(req, url) !== "human") return new Response("unauthorized", { status: 401 });
        return srv.upgrade(req, { data: { role: "human" } }) ? undefined : new Response("upgrade failed", { status: 400 });
      }
      if (!url.pathname.startsWith("/api/") && url.pathname !== "/mcp") return new Response("not found", { status: 404 });
      const role = roleOf(req, url);
      if (!role) return json({ ok: false, code: "UNAUTHORIZED", message: "missing or wrong cockpit token" }, 401);
      try {
        const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
        switch (url.pathname) {
          case "/api/data": {
            const r = cockpit.data(body.source, { filter: body.filter, sort: body.sort, limit: Math.min(Number(body.limit) || 100, 200), offset: body.offset, data: body.data, as: body.as });
            return json(r);
          }
          case "/api/detail": return json(cockpit.detail(url.searchParams.get("ref") ?? ""));
          case "/api/search": return json({ hits: cockpit.search(url.searchParams.get("q") ?? "") });
          case "/api/file": {
            const abs = cockpit.file(url.searchParams.get("path") ?? ""); if (!abs) return json({ ok: false, code: "NOT_FOUND" }, 404);
            // Run files can be anything a product contains, including HTML. Only known image types are served as such; the rest is inert text.
            const ext = path.extname(abs).slice(1).toLowerCase();
            return new Response(Bun.file(abs), { headers: { "cache-control": "no-store", "content-type": IMAGES[ext] ?? "text/plain; charset=utf-8", "x-content-type-options": "nosniff", "content-security-policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src 'self'" } });
          }
          case "/api/boot": return json({ role, agentToken: role === "human" ? agentToken : undefined, tools: toolSchemas(), snapshot: cockpit.snapshot() });
          // Agent role: typed actions and tools. A human-only operation sent here is refused by the reducer with AUTHORITY_HUMAN.
          case "/api/agent/action": return role === "agent" || role === "human" ? json(cockpit.agent(body)) : json({}, 403);
          case "/api/agent/tool": return json(cockpit.tool(body.name, body.input));
          case "/api/notify": cockpit.refresh(); return json({ ok: true });
          // Open the browser from the server side, so the human link never has to leave this process.
          case "/api/open": openBrowser(`${url0}/#t=${humanToken}`); return json({ ok: true });
          case "/mcp": return mcp(cockpit, body);
        }
      } catch (e: any) { return json({ ok: false, code: "SCHEMA", message: String(e?.message ?? e) }, 400); }
      return json({ ok: false, code: "NOT_FOUND" }, 404);
    },
    websocket: {
      data: {} as { role: "human" }, maxPayloadLength: 256 * 1024, idleTimeout: 120,
      open(ws) {
        ws.subscribe("cockpit"); sockets.add(ws); cockpit.clients++; cockpit.writeContext();
        ws.send(JSON.stringify({ t: "snapshot", ...cockpit.snapshot() }));
      },
      message(ws, raw) {
        let m: any; try { m = JSON.parse(String(raw)); } catch { return; }
        if (m.t === "ping") { ws.send(JSON.stringify({ t: "pong" })); return; }
        if (!m.op || !HUMAN_OPS.includes(m.op)) { ws.send(JSON.stringify({ t: "ack", rid: m.rid, result: { ok: false, code: "UNKNOWN_OP", message: "not a human operation" } })); return; }
        const { rid, ...op } = m;
        ws.send(JSON.stringify({ t: "ack", rid, result: cockpit.human(op) }));
      },
      close(ws) { sockets.delete(ws); cockpit.clients = Math.max(0, cockpit.clients - 1); cockpit.writeContext(); },
    },
  });

  const url = url0 = `http://127.0.0.1:${server.port}`;
  cockpit.on((msg) => server.publish("cockpit", JSON.stringify(msg)));

  // Live updates come from the filesystem, not a poll: the engine appends to its log and rewrites files; we re-project on change.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => { timer ??= setTimeout(() => { timer = null; try { cockpit.refresh(); } catch { /* a half-written file is retried on the next change */ } }, 60); };
  const watchers: fs.FSWatcher[] = [];
  const arm = () => {
    for (const w of watchers.splice(0)) w.close();
    const target = fs.existsSync(cockpit.run.dir) ? cockpit.run.dir : o.cwd;
    watchers.push(fs.watch(target, { recursive: true }, (_ev, f) => { if (f && String(f).startsWith(".cockpit")) return; if (target === o.cwd && !String(f).startsWith("actualize")) return; if (target === o.cwd) arm(); schedule(); }));
  };
  arm();

  fs.writeFileSync(path.join(dir, "server.json"), JSON.stringify({ port: server.port, pid: process.pid, url, startedAt: new Date().toISOString() }));
  const stop = () => { for (const w of watchers) w.close(); server.stop(true); try { fs.unlinkSync(path.join(dir, "server.json")); } catch { /* gone */ } cockpit.clients = 0; cockpit.writeContext(); cockpit.close(); };
  // Close every browser socket (graceful restart, or a test of reconnection). The run and the workspace are untouched.
  const dropClients = () => { for (const ws of sockets) ws.close(1012, "restart"); };
  return { server, cockpit, url, dropClients, humanUrl: `${url}/#t=${humanToken}`, humanToken, agentToken, stop };
}

export function openBrowser(link: string) {
  const cands = process.platform === "darwin" ? [["open"]] : process.platform === "win32" ? [["cmd", "/c", "start", ""]] : [["wslview"], ["xdg-open"], ["explorer.exe"]];
  for (const c of cands) { if (!Bun.which(c[0])) continue; try { Bun.spawn([...c, link], { stdout: "ignore", stderr: "ignore", stdin: "ignore" }).unref(); return true; } catch { /* next */ } }
  return false;
}

// Minimal MCP over HTTP (JSON-RPC): initialize, tools/list, tools/call. Same tools, same reducer, agent role only.
function mcp(c: Cockpit, b: any) {
  const reply = (result: unknown) => json({ jsonrpc: "2.0", id: b.id ?? null, result });
  switch (b.method) {
    case "initialize": return reply({ protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "product-actualizer-cockpit", version: "1" } });
    case "ping": return reply({});
    case "tools/list": return reply({ tools: toolSchemas() });
    case "tools/call": {
      const r: any = c.tool(b.params?.name, b.params?.arguments ?? {});
      const ok = r.ok === true;
      return reply({ isError: !ok, content: [{ type: "text", text: JSON.stringify(ok && "result" in r ? r.result : r) }] });
    }
    default: return json({ jsonrpc: "2.0", id: b.id ?? null, error: { code: -32601, message: `no method ${b.method}` } });
  }
}
export { TOOLS };
