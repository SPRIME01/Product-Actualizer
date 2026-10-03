# User-generated language, read 2026-10-03
Method: Exa search restricted by `site:` to Reddit and Hacker News through Agent-Reach (mcporter), plus the open HN API. Verification status matters because the product's own rule bars public copy from anything below OBSERVED:
- **HN:** quotes re-opened against `hacker-news.firebaseio.com` and found verbatim in the post text. Eligible for OBSERVED.
- **Reddit:** text was read in the search provider's page extract. Every direct route to the pages was refused from this host on 2026-10-03: `reddit.com/.json` HTTP 403, the Jina reader HTTP 401, a headless Chrome page of 416 characters (a block page), and `agent-browser` landed on "Reddit - Prove your humanity". No attempt was made to defeat the CAPTCHA. A source that states it and that nobody on this run re-opened is REPORTED. These quotes inform strategy and stay internal until someone with access re-opens the links (U13).

## Language bank (how buyers say it)
| theme | their words | source | status | what we do with it |
|---|---|---|---|---|
| false "done" | "'Finished' and 'correct' get treated as the same thing, and they're not." | r/ClaudeCode 1u9av6m, 2026-07-03 | REPORTED | our first problem line; the gate separates them |
| false "done" | post titles: "Agent said '✅ Done and tested' — it was neither"; "My AI agent kept saying 'Done! Tests pass' when it wasn't true"; "confident wrong 'done'" | r/ClaudeCode threads, 2026-07 | REPORTED | the pain has a name: confident wrong "done" |
| fix people reach for | "a deterministic gate rather than another agent: a Stop hook that won't let the task finish"; "the fix was receipts, not better prompts" | r/ClaudeCode, 2026-07 | REPORTED | validates a code gate with no model in it (our C11) |
| enforcement vs prompt | "Instructions are not guarantees." "A prompt is a probabilistic influence on model behavior. A rule is an enforcement mechanism." | HN 48558502, 2026-06-16 | verbatim in post | usable publicly, attributed (C43) |
| launch vs ship | "Vibe coding made building fast but it also made me forget that shipping is not the same as launching." "The product was never the issue. The packaging was." | r/vibecoding 1tdjwfv, 2026-05-15 | REPORTED | the ICP's trigger: it works, there is nothing to launch with |
| fear | "it works but I'm scared to ship it" | r/VibeCodersNest 1t692t6, 2026-05-07 | REPORTED | trigger language for A4 |
| stale memory | "The memory is still there, so the next agent has no reason not to trust it." | r/AI_Agents 1vycdzp, 2026-08-25 | REPORTED | our staleness mechanism, in their words |
| drift | "All blue, none of them the same blue." | r/AI_Agents 1ugvj9k, 2026-06-27 | REPORTED | why artifacts must cite one model |
| forgotten decisions | "Tests can confirm that the new code works, while still missing that it should never have been created in that form." | r/vibecoding 1v8dwez, 2026-07-27 | REPORTED | decisions belong in the model, not the chat |
| SDD overhead | "These frameworks feel like I'm using enterprise tooling to build a lemonade stand." "I can't find a single real-world example of a successful SaaS that credits these frameworks." | r/SaaS 1pw4oe5, 2025-12-26 | REPORTED | our biggest adoption objection: weight. Answer honestly with the measured footprint (C44) and no customer claims |
| skills weight | "When you come to a point where you installed at least 3-5 skills, your workflow becomes too heavy for Claude." | r/ClaudeCode 1ve5dc7, 2026-08-03 | REPORTED | answer with measured progressive disclosure (C44, C45) |
| AI-slop copy | "Streamline your workflow." "Built for modern teams." "unlock the power of"; "cut any sentence where you could swap your product name for any other SaaS and it'd still make sense." | r/SaaS 1w2p2hl 2026-08-30; r/microsaas 1ugobuq 2026-06-27 | REPORTED | the community's own negation test; our voice refuses these words |
| copy that lies | post title: "Your landing page copy is probably lying about what you actually built" | r/ (indexed under the same search), 2026 | REPORTED | the claims ledger applied to copy |
| conversions | "Signups dropped by roughly a fifth" after swapping to generated copy (one founder's report) | r/SaaS 1w2p2hl, 2026-08-30 | REPORTED | anecdote, never used as a number |
| first users | "Built an AI app smoothly, but stuck on marketing"; "what real marketing looks like at this speed" | r/vibecoding 1r7ypgq 2026-02-18; r/VibeCodeCamp 1qbycip 2026-01-13 | REPORTED | the audience is asking for launch help in public |

## Tools buyers are already building (UGC-born alternatives)
| tool | what it does, in its author's words | where | note |
|---|---|---|---|
| nah | "a PreToolUse hook that classifies every tool call ... deterministic classifier" | HN 47343927, 2026-03-11, 127 points, 94 comments | permission guard; proves appetite for deterministic hooks |
| SSG (SigmaShake Governance) | "sits between the agent and its tools"; "Bypasses are allowed, but recorded" | HN 48558502, 2026-06-16, 1 point, 0 comments | policy gate; a launch with no traction: calibrates our thresholds |
| VSDD | verified spec-driven development | HN 47197595, 2026-02-28, 211 points, 118 comments | the spec camp adding verification |
| mex | memory wiki plus `mex check`: "validates concrete claims against the actual repo" | r/AI_Agents 1vycdzp | closest in spirit for code memory; code-only |
| MemBridge | shared decisions across Claude Code and Codex via CLAUDE.md / AGENTS.md | r/AI_Agents 1v8620w | memory sync |
| VibeRaven Station | "what is real vs half-wired", checklist for "it works but I'm scared to ship it" | r/VibeCodersNest 1t692t6 | repo scanner for launch readiness; code-only |
| preflight scripts, repo "fixers" | "No more unsecure launches" | r/vibecoding | security checklists |
None of these was found extending graded claims to brand, site, film and copy (absence in one search, not proof: C36 stays PROPOSED).

## What this changes
1. Problem section leads with the buyers' words, but only the HN quote may appear publicly now; Reddit quotes wait for U13.
2. "Gate" is the buyers' own word for the fix. "Evidence-gated" stays.
3. The honest hard objections are weight and proof of use. The site answers weight with measurements and says plainly that no customer evidence exists.
4. Voice: the community already treats "unlock the power of", "seamlessly", "streamline your workflow" and em dashes as AI slop. Already refused; add "streamline" and "modern teams" to the refused list.
5. ICP trigger sharpened: it works, there is nothing to launch with, and the owner is afraid to say more than the product does.
