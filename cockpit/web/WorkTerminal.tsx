// The Work Terminal: one persistent line for the work, not a chat. Known questions open the view that answers them; an imperative becomes a typed,
// durable work request that stays "queued" until an executor acknowledges it. Nothing typed here runs anything, and it can only act as the owner
// (the page holds the human token). The log is compact and chronological, with no speech bubbles; requests show their real lifecycle state.
import React, { useRef, useState } from "react";
import { send, useStore } from "./store";
import { Status } from "./ui";

const LIVE = ["queued", "acknowledged", "running", "produced", "ready_for_review", "blocked"];
const MODES: Record<string, string> = { orient: "ORIENT", execute: "EXECUTE", decide: "DECIDE", verify: "VERIFY", complete: "COMPLETE" };

export function WorkTerminal() {
  const work = useStore((s) => s.work); const conn = useStore((s) => s.conn);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(false);
  const hist = useRef<string[]>([]); const at = useRef(-1);
  const log: any[] = work?.log ?? []; const reqs: any[] = work?.requests ?? [];
  const live = reqs.filter((r) => LIVE.includes(r.status));
  const last = log[log.length - 1];

  const run = async (t: string) => {
    const v = t.trim(); if (!v || busy) return;
    setBusy(true); hist.current.push(v); at.current = -1;
    try { const r = await send({ op: "human.terminal", text: v }); if (r.ok) setText(""); } finally { setBusy(false); }
  };
  return (
    <footer className="term" data-terminal aria-label="Work Terminal" data-open={open}>
      {open ? (
        <div className="term-log" role="log" aria-live="polite">
          {log.slice(-12).map((e, i) => (
            <div key={i} className={`term-row ${e.kind}`}><span className="term-cmd">› {e.text}</span><span className="term-say">{e.say}</span></div>
          ))}
          {!log.length ? <div className="muted term-row">Try: <i>what should happen next?</i> · <i>show me what blocks acceptance</i> · <i>show the workflow</i> · <i>verify the current frontend</i></div> : null}
        </div>
      ) : null}
      {live.length ? (
        <div className="term-reqs" aria-label="work requests">
          {live.slice(0, 6).map((r) => (
            <span key={r.id} className={`term-req ${r.status}`} title={`${r.text}\n${r.next}`}>
              <b>{r.id}</b> <Status s={r.status} /> <span className="term-req-text">{r.text}</span>
              {r.status === "ready_for_review" ? <>
                <button className="term-act ok" onClick={() => send({ op: "human.review", subject: r.id, outcome: "accepted" })}>Accept</button>
                <button className="term-act" onClick={() => { const note = window.prompt(`Why reject ${r.id}? (optional)`) ?? undefined; send({ op: "human.review", subject: r.id, outcome: "rejected", ...(note ? { note } : {}) }); }}>Reject</button>
              </> : null}
              <button className="term-act" aria-label={`cancel ${r.id}`} title="cancel this request" onClick={() => send({ op: "human.cancel", request: r.id })}>×</button>
            </span>
          ))}
          <span className="muted term-hint">{work?.agentSeen ? "an agent has called the cockpit; queued work is acknowledged by the agent, not by this page" : "queued: no agent is connected; it will see this at its next interaction"}</span>
        </div>
      ) : null}
      <form className="term-line" onSubmit={(e) => { e.preventDefault(); run(text); }}>
        {work ? <button type="button" className="term-mode" data-mode={work.mode} title={`${work.why}. Click to open the Workbench.`} onClick={() => send({ op: "human.open", template: "workbench" })}>{MODES[work.mode] ?? work.mode}</button> : null}
        <label className="sr" htmlFor="term-input">Work Terminal</label>
        <span className="term-prompt" aria-hidden>›</span>
        <input id="term-input" className="term-input" value={text} autoComplete="off" spellCheck={false} disabled={conn !== "live"}
          placeholder={conn === "live" ? "Ask about the work, or say what to do: what should happen next? · verify the current frontend" : "disconnected; the run continues without the cockpit"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && hist.current.length) { e.preventDefault(); at.current = at.current < 0 ? hist.current.length - 1 : Math.max(0, at.current - 1); setText(hist.current[at.current]); }
            else if (e.key === "ArrowDown" && at.current >= 0) { e.preventDefault(); at.current += 1; setText(at.current >= hist.current.length ? "" : hist.current[at.current]); if (at.current >= hist.current.length) at.current = -1; }
          }} />
        {last && !open ? <span className={`term-last ${last.kind}`} title={last.say}>{last.say}</span> : null}
        <button type="button" className="iconbtn" aria-expanded={open} aria-label="terminal log" title="log" onClick={() => setOpen(!open)}>{open ? "▾" : "▴"}</button>
      </form>
    </footer>
  );
}
