built_from: model@10
reads: [actors, capabilities, constraints, positioning, voice, claims, unknowns, decisions]
cites: [C1, C2, C3, C4, C5, C6, C8, C11, C12, C13, C14, C15, C16, C17, C18, C19, C20, C21, C22, C23, C27, C28, C29, C31, C32, C33, C38, C39, C40, C41, C43, C44, C45, C55, C56, C57, C58, C59, C60, C61, C62, C63, C67, C68, C69, C71, C72, C73, C79, C80, C81, C82]
public: true
status: final

# Website copy (source of truth for website/)

Each `## key` below is one string on the page. `[C#]` marks a claim; the site shows its grade and source. Strings without a claim are labels, instructions or questions.

## meta.title
Product Actualizer: evidence-gated product completion

## meta.description
Product Actualizer keeps one graded model of what is true about your product, software or hardware, and refuses to call a launch ready until the evidence is there. [C2][C6]

## hero.kicker
The part after “done”

## hero.headline
Finish the product. Show the evidence.

## hero.sub
Your agent says it’s done. So does the board. Product Actualizer is where “done” has to answer: every claim graded, every artifact citing it, and a gate that can refuse the launch. [C2][C6]

## hero.cta.primary
Read the run

## hero.cta.secondary
Replay a worked example

## hero.cta.tertiary
Source on GitHub

## hero.license
Licensed under the GNU Affero General Public License version 3, as the LICENSE file in the repository states. [C17]

## film.title
The short version

## ledger.title
Check a claim yourself

## ledger.intro
Below is a public page from a worked example, with the claims it cites. Downgrade one, then run the validator. [C3][C38]

## problem.title
The hard part moved from making to finishing

## problem.lead
Agents have made the first stretch of building fast. The people doing the finishing describe a different job.

## problem.q1.text
“Instructions are not guarantees.”

## problem.q1.src
A Show HN post, 2026-06-16 [C43]

## problem.q2.text
“The bottleneck isn't building anymore. It's completing.”

## problem.q2.src
DEV Community, 2026-09-27 [C31]

## problem.q3.text
Agents left a required file unread in 67.9% of runs, and 80.4% of those runs were misleading about it.

## problem.q3.src
arXiv 2609.20812, submitted 2026-09-17 [C27]

## problem.q4.text
Are these videos of it eg tidying up real or just staged / cherry picked?

## problem.q4.src
A comment on a robotics launch, Hacker News, 2026-09-01 [C69]

## problem.body
Spec toolkits point an agent from intent to code. Spec Kit had 139,998 GitHub stars on 2026-10-03 [C29], and one close reading reports that it produced many repetitive Markdown files to review [C28]. This page is about what comes after the build, for code and for hardware: the brand, site, film and copy that make a launch, and whether their sentences are true.

## mech.title
One model, five rules

## mech.1.title
One ledger, seven grades

## mech.1.body
Every claim about the product carries a grade and a source anyone can re-open. OBSERVED and VERIFIED claims can be published. The rest stay internal. [C2]

## mech.2.title
Copy cannot outrun the evidence

## mech.2.body
A public artifact that cites a claim graded below OBSERVED is rejected. We downgraded a claim in a worked example and the validator refused. We restored it and it passed. [C3]

## mech.3.title
Changes make dependents stale

## mech.3.body
Artifacts record the model version they were built from. When a later decision touches a claim they cite, they are flagged stale, by version comparison and not by memory. [C4]

## mech.4.title
Work is capabilities, in an order

## mech.4.body
Seventeen lenses declare what they read and what they need. Selecting some orders them into waves. [C1][C5] The tool that does the work is a replaceable executor, and the catalogue says found or unknown, never usable. [C20]

## mech.5.title
The agent cannot accept its own work

## mech.5.body
An agent can report progress and mark work ready for review. Only the owner accepts. When an agent tries, the cockpit returns AUTHORITY_HUMAN. [C12]

## mech.5.quote
“A prompt is a probabilistic influence on model behavior. A rule is an enforcement mechanism.”

## mech.5.quote.src
A Show HN post, 2026-06-16 [C43]

## lab.title
Change the model, watch the work go stale

## lab.intro
The worked example is Loam, a fictional soil probe. [C38] Record a decision, then see which artifacts depend on what it touched.

## waves.title
The order of work comes from what each lens needs

## waves.intro
Pick the lenses a goal needs. They arrange into waves from their declared needs, and the gate always runs last. [C5]

## caps.title
Capability, implementation, executor

## caps.body
A lens is the capability: a kind of judgement work. An implementation is a mechanism that can realise it, listed as candidates. The executor is whoever runs it. The three stay separate. [C20] On the machine that made this page, ffmpeg was found, and hyperframes, bang-motion and anidoodle were unknown. [C20]

## authority.title
Who may move a request

## authority.intro
A typed request stays queued until an executor acknowledges it. The agent moves it forward. Only the owner accepts. [C13] In the run that made this page, request R1 passed through every state. [C41]

## run.title
This page came out of a run

## run.body
The governed run is stored in the repository: the model with its decisions, the proposals each lens made and how each was ruled on, the history of model versions, and the evidence. [C39] The cockpit screenshots on this page were captured from that run. [C40]

## proof.title
What was run

## proof.1
The validator refuses a public artifact once a cited claim drops below OBSERVED, and accepts it again when the grade is restored. [C3]

## proof.2
The staleness check flags an artifact built from an earlier model version once a later decision touched a claim it cites. [C4]

## proof.3
Two worked examples, one software and one hardware, replay as tests. The hardware checks are tested against mutated copies and must fail each one. [C15][C16]

## proof.4
A clean clone installs, type-checks and builds. Its first test run failed on a race in one of our own browser tests. After the fix, 315 tests passed. [C19]

## proof.5
The compiled executable, 85 MB for Linux x86_64, ran with no Bun on the path. [C8][C21]

## proof.6
Neither the process engine nor the cockpit contains a reference to a model provider's endpoint. [C11]

## proof.not.title
What was not verified

## proof.not.body
The hooks were not run on Codex, Cline, OpenCode or Prime, though the installer has adapters for them. [C23] The executable was built for Linux x86_64 only. [C21] No release or package has been published. [C18] We make no claim about outcomes, speed or adoption.

## found.title
What the run found about the product itself

## found.1
The Work Terminal did not understand our own example request and queued nothing until we used the request: prefix. [C14]

## found.2
A browser test read the page before it had loaded and failed in some runs. We fixed the test. [C19]

## found.3
Partway through the run the owner added a license. That made a claim on our own ledger false, and the artifacts that cited it were flagged stale until the ledger was corrected. [C68]

## who.title
Who it is for

## who.change
The change: agents and tools made building and demonstrating cheap, so the hard part moved to completing, verifying and launching. [C31]

## who.for
Technical founders and small teams who already build with a coding agent and have a working product to launch. Builders of hardware and physical AI, whose claims need a real unit. Studios that inherit an incomplete product and must hand over what is true and what is not. [C33]

## who.today
Developers are already building stopgaps in public: a permission guard, verified spec-driven development, a policy gate. [C55]

## who.not
Not for buyers who want an agent to ship without an owner reading the verdict, buyers who need a hosted service, or buyers who need guarantees about code correctness.

## faq.title
Questions

## faq.1.q
Is this another spec-driven framework?

## faq.1.a
Spec toolkits direct an agent from intent to code. [C28] Here the unit is the claim with its evidence, and it covers brand, site, film and copy as well as code. [C1] We make no claim that it is better at code.

## faq.2.q
Does it make my agent's code correct?

## faq.2.a
No. It grades claims, cites sources, flags stale work and refuses to pass a gate. [C6] Tests still run, and their results become evidence.

## faq.3.q
Does it call a model?

## faq.3.a
No. Neither the process engine nor the cockpit contains a reference to a model provider's endpoint. [C11] Your agents are the executors.

## faq.4.q
Which agents does it work with?

## faq.4.a
The installer has adapters for Claude Code, Codex, Cline, OpenCode and Prime. [C23] Skills are plain Markdown files with front matter. [C22] Codex and Cursor both document skills as a directory with a SKILL.md file. [C32]

## faq.5.q
Can I use the code?

## faq.5.a
Yes, under the GNU Affero General Public License version 3, the license in the repository's LICENSE file. [C17] Its network clause means that if you run a modified version as a service, you must offer its source to the people who use it.

## faq.6.q
Is it released?

## faq.6.a
No release or package has been published. [C18]

## faq.8.q
Will it bloat my context?

## faq.8.a
The text the process always loads is 12,195 bytes. The 17 lens files total 160,045 bytes, but selecting lenses reads only their 7,091 bytes of front matter, and the hook engine denies a read of a lens body until that lens starts. [C44][C45]

## faq.7.q
Where does the name come from?

## faq.7.a
To actualize is to make real, and the command line verb is actualize. Product Actualizer Architect is the internal descriptor.

## replay.title
Replay it

## replay.1
Replay both worked examples as tests. [C15]

## replay.2
List the lenses. [C1]

## footer.name
Product Actualizer. Internal descriptor: Product Actualizer Architect.

## footer.license
Licensed under the GNU Affero General Public License version 3. [C17]

## ledger.note
The validator in this panel is the repository's own file, shipped to your browser unmodified. [C59] For each of the five claims you can downgrade, it printed the same refusal as the repository's validator. [C61]

## lab.note
The staleness check is the same file. The rebuild buttons are simulated: in the product, a rebuild is a lens run. [C59]

## waves.note
The wave function in this page matched the engine's for four sets of lenses. [C62]

## authority.note
This demo returned the same result and message as the cockpit's own code for all 162 combinations of state, target and actor. [C60]

## film.note
Rendered from source by a deterministic script; sampled frames hashed identically in two independent runs. [C80] The film runs about 80 seconds, with captions. [C79]

## film.voice
The narration was generated with fish-audio/s2.1-pro-free:free. [C82] Fish Audio's pages say commercial use of its model needs a separate license, and that has not been confirmed for this voice. [C57]

## proof.7
The built site passed automated checks for overflow at five widths in light and dark, text contrast, a visible focus ring on every keyboard stop, and reduced motion. [C63] Its first load is under 150 KB with gzip, excluding images and the film. [C67]

## proof.8
A scan of the working tree and git history found no key, token, or private key. [C58] Both fonts are licensed under the SIL Open Font License 1.1. [C56]

## replay.3
Start a run on your own product.

## replay.3.note
The run on this repository is the example: it was opened with the same command. [C39]

## any.title
Any product, not only code

## any.lead
The lenses cover software, brand, design, motion and sound and, when a product has hardware, electronics, firmware, robotics and three-dimensional renders. They are grouped here as the cockpit groups them. [C71]

## any.rule.title
Physical claims need a real unit

## any.rule
A hardware release cannot pass on a firmware build, passing tests, a schematic, a render, or documentation. The claim has to be exercised on the real unit at the revision being shipped. [C73]

## any.mote
In the hardware worked example, a fictional desk robot, the release gate returned no-go and listed claims that had never run on the unit. [C72][C38]

## any.gap
The hardware side is shown here through that worked example only.

## faq.9.q
Is this only for software?

## faq.9.a
No. The lenses include electronics, embedded systems, robotics and three-dimensional visualization, and the release lens refuses a physical claim that was never exercised on the real unit. [C71][C73]

## gap.title
Done, as currently practised

## gap.lead
Your agent says it’s done. So the board says it’s done. The board has never met a customer.

## gap.board.todo
to do

## gap.board.done
done

## gap.board.cust
customers met by this board

## gap.col.q
the question

## gap.col.usual
the usual answer

## gap.col.ours
Product Actualizer

## gap.q.1
Says who?

## gap.usual.1
“Trust me.”

## gap.ours.1
A source you can re‑open, on every claim. [C2]

## gap.q.2
On the real unit?

## gap.usual.2
“On the render.”

## gap.ours.2
A gate that refuses a hardware release until the claim has run on the unit. [C73]

## gap.q.3
What changed since?

## gap.usual.3
“Slack, probably.”

## gap.ours.3
Whatever cites a changed claim is marked stale. [C4]

## gap.q.4
Who decides it’s done?

## gap.usual.4
“Whatever did the work.”

## gap.ours.4
You. An agent that tries to accept gets AUTHORITY_HUMAN. [C12]

## gap.note
The middle column is a joke about how “done” usually gets decided: it is about the habit, not about any person or product. The right column is what this repository does, with the claim behind each line.

## film.sound
The score and sound effects are synthesised by code in the repository; no third-party audio is used. [C81]
