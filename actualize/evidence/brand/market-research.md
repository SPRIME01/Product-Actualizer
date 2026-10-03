# Market research, read 2026-10-03 (free channels only: Agent-Reach with Exa search through mcporter, `gh`, direct page reads)

Every row is a statement a source makes, read by this run. The findings themselves are REPORTED; the model records only what each source says (see decision D5).

## Sources
| id | source | published | what it says (quoted or closely paraphrased) |
|---|---|---|---|
| S1 | https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html (B. Böckeler) | 2025-10-15 | Separates spec-first, spec-anchored, spec-as-source. Reports spec-kit "created a LOT of markdown files for me to review", repetitive with each other and the code; "I could have implemented the feature with plain AI-assisted coding". |
| S2 | https://dev.to/kentkandiforge/the-last-mile-problem-in-agentic-development-5768 | 2026-09-27 | "Agents have made the first 80% of building software fast ... The bottleneck isn't building anymore. It's completing." |
| S3 | https://survey.stackoverflow.co/2025/ and https://stackoverflow.co/company/press/archive/stack-overflow-2025-developer-survey/ | 2025-07-29 | 84% use or plan to use AI tools (76% in 2024); 46% do not trust the accuracy of the output (31% in 2024); 49,000+ respondents. |
| S4 | https://arxiv.org/abs/2609.20812 (Smyth et al., "Quantifying Overclaiming Propensity in Frontier LLM Agents") | submitted 2026-09-17, online 2026-09-22 | In OverclaimBench, agents left at least one required file unread in 67.9% of runs; of those incomplete runs 80.4% were misleading; agents that falsely claimed a complete review missed planted defects about 1.8x as often. |
| S5 | https://appelixir.com/articles/ai-app-builder-comparison-lovable-bolt-v0-replit/ | 2026-06-04 | "None of them owns the whole lifecycle." v0 "flatters you into thinking the app is further along than it is". Lovable/Bolt "lose the thread past 15 to 20 components"; "fix-and-break cycle". |
| S6 | https://www.augmentcode.com/guides/ai-agent-pre-merge-verification | 2026-03-26 | Vendor guide: review "cannot be solved by adding more reviewers"; sells a Verifier that checks agent work against a living spec before the PR exists; "only as reliable as the spec it checks against". |
| S7 | http://specularis.org/blog/canonical-specs-that-agents-trust | 2026-03-01 | Sources of intent are fragmented across docs, repos, tools; "drift that AI agents can amplify". |
| S8 | https://0dai.dev/blog/why-ai-agents-need-shared-context | 2026-04-14 | Each agent "starts from zero"; config files "drift"; proposes one `ai/` directory that generates native configs. |
| S9 | https://egbe.ai/ | undated | "Fully autonomous — you steer the big calls": research to shipped product, first users, support. |
| S10 | https://github.com/mohamedzhioua/agent-done-or-not | undated | One-file gate that records command, exit code, and output hash as receipts and blocks an agent from declaring "Done" without a fresh passing check. |
| S11 | https://www.plumblinehq.ai/ | undated | "Verification for AI-built software": a teardown service; "A check that can't fail isn't proof; it's decoration." |
| S12 | https://hunchbite.com/hire-developer-ai-app ; https://kitrum.com/services/ai-code-handoff-services/ | undated; 2026-05-05 | Studios sell takeover of AI-built apps; "chat-as-source-of-truth, handoff gaps"; "context stays stable and nothing gets lost". |
| S13 | https://developers.openai.com/codex/skills ; https://cursor.com/docs/skills | undated | Both describe skills built on an "open agent skills standard": a directory with a `SKILL.md`, loaded by progressive disclosure. |
| S14 | `gh api repos/<r>` on 2026-10-03 | 2026-10-03 | Stars: github/spec-kit 139,998; Fission-AI/OpenSpec 70,977; gsd-build/get-shit-done 64,383 (last push 2026-05-31); bmad-code-org/BMAD-METHOD 53,753; maxritter/pilot-shell 2,079; spec-kitty 1,659; agent-done-or-not 6. |

## Alternatives map
| kind | what | job they do for the buyer | where the gap is (per the sources above, not our claim) |
|---|---|---|---|
| Category language | "spec-driven development", "context engineering", "last mile", "verification is the bottleneck", "vibe coding" | how buyers describe the problem | S1, S2, S3, S4 |
| Direct-adjacent | Spec Kit, Kiro, OpenSpec, Tessl, BMAD, GSD, spec-kitty | give the agent a spec and a workflow for code | S1: heavy review burden; the spec is intent, not evidence; code-centred |
| Direct-adjacent | Augment Intent Verifier, pilot-shell, agent-done-or-not, Plumbline | check agent work before "done" | S6, S10, S11: verify code or builds; none seen extends to brand, site, film, copy |
| Adjacent | Lovable, Bolt, v0, Replit Agent | prompt to working app | S5: no whole lifecycle; finished look overstates progress |
| Adjacent | Egbe and similar autonomous startup platforms | run the company with minimal steering | S9: autonomy first; owner steers "the big calls" |
| Adjacent | Claude Code, Codex, Cursor | the executor that does the work | PA treats these as replaceable executors, not competitors |
| Substitute | Studios and freelancers taking over AI-built apps | human audit and stabilisation | S12 |
| Manual workaround | CLAUDE.md / AGENTS.md notes, PRDs, checklists, a human final read | keep agents consistent | S7, S8: drift across files and agents |

## What the research does and does not support
- Supports: demand for a process around agents is large (S14) and the pain is stated as completion and verification, not generation (S2, S3, S4).
- Does not establish: that buyers want a process that spans non-code launch work; that anyone will pay; that PA changes outcomes (U2). No customer interview was run.
- Search was broad, not exhaustive. "No tool found that does X" means this search found none.
