// Text to speech through OpenRouter, with the one model this film is allowed to use.
//   bun media/explainer/tools/tts.mjs <input.txt> <output.mp3> [--voice <id>]
// The key is read from OPENROUTER_API_KEY in the environment only. It is never printed, logged, or written anywhere; errors print status and body, never headers.
import fs from "node:fs";
const MODEL = "fish-audio/s2.1-pro-free:free";   // required by the brief; never substituted
const [, , inFile, outFile, ...rest] = process.argv;
const key = process.env.OPENROUTER_API_KEY;
if (!key) { console.error("OPENROUTER_API_KEY is not set in the environment"); process.exit(2); }
const voice = rest.includes("--voice") ? rest[rest.indexOf("--voice") + 1] : undefined;   // a Fish voice id, as documented at https://openrouter.ai/fish-audio/s2.1-pro-free/llms.txt
const logFile = rest.includes("--log") ? rest[rest.indexOf("--log") + 1] : undefined;
const input = fs.readFileSync(inFile, "utf8").trim();
const body = { model: MODEL, input, response_format: "mp3", ...(voice ? { voice } : {}) };
let last;
for (let attempt = 1; attempt <= 5; attempt++) {
  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const type = res.headers.get("content-type") ?? "";
  if (res.ok && /^audio\//.test(type)) {
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outFile, buf);
    const rec = { ok: true, model: MODEL, status: res.status, contentType: type, bytes: buf.length, attempt, voice: voice ?? "(provider default)", generationId: res.headers.get("x-generation-id") ?? null, input: inFile, output: outFile };
    console.log(JSON.stringify(rec)); if (logFile) fs.appendFileSync(logFile, JSON.stringify({ ...rec, at: new Date().toISOString() }) + "\n");
    process.exit(0);
  }
  last = { status: res.status, contentType: type, body: (await res.text()).slice(0, 400) };
  console.error(JSON.stringify({ attempt, ...last }));
  if (![408, 425, 429, 500, 502, 503, 504].includes(res.status)) break;
  await new Promise((r) => setTimeout(r, 2000 * attempt));
}
console.error("TTS failed; no substitute model is used."); process.exit(1);
