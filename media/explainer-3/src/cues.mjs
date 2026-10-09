// The single source of timing for film 3. Both the picture (film.mjs) and the sound (tools/score.mjs) read these absolute film times,
// so a card lands on the frame its click sounds. Pure: depends only on the timeline.
export function events(TL) {
  const L = (i) => TL.lines[i];
  const parts = (i) => L(i).text.split(/(?<=[.!?])\s+/);
  // start of sentence k of line i: the measured pause when the voice gave a clean one, otherwise proportional to characters spoken
  const sent = (i, k) => {
    const l = L(i), ps = parts(i); if (k <= 0) return l.start;
    const br = l.breaks ?? [], clean = br.length === ps.length - 1 && br.every((b, j) => j === 0 ? b > 0.3 : b - br[j - 1] > 0.3);
    if (clean) return l.start + br[k - 1];
    return l.start + l.duration * ps.slice(0, k).join(" ").length / l.text.length;
  };
  const at = (i, f) => L(i).start + f * L(i).duration;
  const e = {};
  e.board = { land: [sent(0, 0) + 0.3, sent(0, 0) + 1.15, sent(0, 1) + 0.25, sent(0, 1) + 1.0], customers: sent(0, 2) + 0.15 };
  e.lies = [0, 1, 2].map((k) => ({ in: sent(1, k), note: sent(1, k) + 1.0 }));
  e.gap = { fast: sent(2, 0) + 0.1, slow: sent(2, 1) + 0.2, owner: sent(2, 2) + 0.1, launch: at(2, 0.8) };
  e.drop = { fall: at(3, 0.42) }; e.drop.crash = e.drop.fall + 0.42;
  e.plot = { nodes: L(4).start + 0.3, tangle: sent(4, 0) + 1.0, pin: sent(4, 1) + 0.55, model: sent(4, 2) + 0.1 };
  e.compare = { q: [0, 1, 2].map((r) => sent(5, 2 * r)), usual: [0, 1, 2].map((r) => sent(5, 2 * r + 1)), ours: [0.38, 0.6, 0.84].map((f) => sent(5, 6) + f * (L(5).end - sent(5, 6))) };
  e.refusal = { agent: sent(6, 1) - 0.1, declined: sent(6, 2) + 0.15, owner: sent(6, 2) + 2.0 };
  e.end = { mark: L(7).start, tag: sent(7, 1), cta: sent(7, 2) + 0.4 };
  // the effects the score places: [time, kind]
  const c = [];
  e.board.land.forEach((t) => c.push([t, "click"])); c.push([e.board.customers, "tick"]);
  e.lies.forEach((x) => { c.push([x.in, "tick"]); c.push([x.note, "stamp"]); });
  for (let i = 0; i < 6; i++) c.push([e.gap.fast + i * 0.13, "pop"]);
  for (let i = 0; i < 3; i++) c.push([e.gap.slow + i * 0.7, "lowpop"]);
  c.push([e.gap.owner, "tick"], [e.gap.launch, "stamp"]);
  c.push([e.drop.fall, "whoosh"], [e.drop.crash, "crash"]);
  c.push([e.plot.pin, "thunk"], [e.plot.model, "chime"]);
  e.compare.q.forEach((t) => c.push([t, "tick"])); e.compare.usual.forEach((t) => c.push([t, "lowpop"])); e.compare.ours.forEach((t) => c.push([t, "stamp"]));
  c.push([e.refusal.agent, "tick"], [e.refusal.declined, "buzz"], [e.refusal.owner, "chime"]);
  c.push([e.end.mark, "thunk"], [e.end.tag, "chime"]);
  return { e, cues: c.sort((a, b) => a[0] - b[0]), sent, at };
}
