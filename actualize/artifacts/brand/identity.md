built_from: model@10
reads: [purpose, actors, constraints, voice, positioning, claims, unknowns, decisions]
cites: [C1, C2, C3, C4, C5, C6, C11, C12, C15, C17, C20, C23, C27, C28, C31, C34, C35, C39, C43, C44, C45, C55, C71, C72, C73]
public: false
status: final

# Verbal identity: Product Actualizer

Internal and category descriptor: Product Actualizer Architect. Public brand: **Product Actualizer**. Short form in running text: Actualizer. CLI verb: `actualize`. Decision D3; screening in evidence/brand/name-clearance.md: the exact phrase is unclaimed [C35] and the alternatives Warrant and Plumbline are held by live products [C34]. The name is a screened working choice until U6 and U8 are closed.

## Category, position, difference
- **Category:** evidence-gated product completion, for any product that is only partly real: software, hardware, or both. One graded model of what is true, specialist work ordered against it, and a gate that can say no. Anchor for a first-time reader: agent skills and spec-driven development, carried past code to brand, design, motion, sound and physical engineering [C28][C71].
- **The ICP, by the owner's test:** the change is that coding agents made building cheap, so the hard part moved to completing and launching [C31]. The customer who succeeds already builds with an agent, has a working product, and has an owner who reads verdicts. Acute pain: a confident wrong "done" and nothing to launch with. Unnamed pain: launch material and memory that drift from the product unchecked. What they do instead of nothing: build stopgaps in public [C55]. Evidence in evidence/brand/icp.md; demand rows J1 to J3 in the model.
- **Position:** for technical founders and small teams who build with coding agents and now have to launch, and for hardware and physical-AI builders with an incomplete unit (a second buyer that no one has yet tested, U16), Product Actualizer keeps one graded model of what is true, orders specialist work against it, and uses a gate that can say no. Software is the easiest thing to demonstrate in a browser; the hardware worked example shows the depth: its gate said no [C72].
- **Alternative today:** agent chat plus notes, a spec toolkit for the code, separate tools for brand, site and film, and a final human read.
- **Difference (mechanism):** every artifact cites graded claims from one model [C2]; a public artifact that cites a claim below OBSERVED is rejected [C3]; a changed claim makes the artifacts that cite it stale [C4]; the run cannot end while work is outstanding [C6]. The trigger is the buyer's own: it works and there is nothing to launch with. The comparative claim that no other tool does this is PROPOSED and is never stated publicly (C36).
- **Not for:** buyers who want an agent to ship without an owner reading the verdict; buyers who need a hosted service; buyers who need guarantees about code correctness.

## Message hierarchy
1. **Category:** Evidence-gated product completion for any product that is only partly real, software or hardware.
2. **One line:** One graded model of what is true about your product, specialist work ordered against it, and a gate that can say no.
3. **Headline:** Finish the product. Show the evidence. **Pain-first opener (D19):** Your agent says it's done. So does the board. The board has never met a customer.
4. **Supporting statement:** Agents and tools produce code, drawings, renders and copy quickly. Product Actualizer keeps the model they must answer to: every claim graded, every artifact citing it, and a gate that will not call the launch ready until the evidence is there. For a physical product the gate also refuses a claim that was never exercised on the real unit [C73].
5. **Mechanism messages:**
   - **One ledger, seven grades.** Every claim about the product carries a grade and a source anyone can re-open [C2].
   - **Copy that cannot outrun the evidence.** Public artifacts may cite only OBSERVED or VERIFIED claims; the validator rejects the rest [C3].
   - **Changes propagate.** Change a claim and every artifact that cites it goes stale, by version comparison and not by memory [C4].
   - **Work is a capability in an order.** Seventeen lenses declare what they read and what they need, from brand and motion to electronics, firmware, robotics and three-dimensional renders; selection becomes dependency waves; the tool that does the work is replaceable and reported as found or unknown, never assumed [C1][C5][C20][C71].
   - **Physical claims need a real unit.** A hardware release cannot pass on a build, a schematic, a render or documentation; the claim has to be exercised on the unit at the shipping revision. In the hardware example the gate returned no-go [C73][C72].
   - **Agents cannot accept their own work.** An agent reports progress and marks work ready for review; only the owner accepts; the gate can return no-go [C12][C6].
6. **Proof points (all re-openable):** the validator rejects a public artifact once its cited claim is downgraded, run as a negative control [C3]; two worked examples, software and hardware, replay as tests, and the hardware one ends in a no-go gate [C15][C72]; the process engine and cockpit contain no model-provider calls [C11]; the run that produced this site is in the repository's `actualize/` directory [C39].
7. **Why the problem is real (attributed, never our fact):** a Show HN post puts the whole case in four words, "Instructions are not guarantees" [C43]; one benchmark paper reports agents left required files unread in 67.9% of runs, and 80.4% of those runs were misleading about it [C27]. Buyers' own words for it (confident wrong "done", shipping is not launching, stale memory the next agent trusts) are in evidence/brand/ugc-language.md; they are REPORTED and stay internal until re-opened (U13).

## Objections
| objection | answer |
|---|---|
| Is this only for software? | No. The lenses include recon of physical objects, electronics, embedded systems, robotics and 3D visualization, and the release lens refuses a physical claim that was never exercised on the real unit [C71][C73]. The hardware side has been exercised only through a fictional worked example, and no hardware builder has run it (U16) [C72]. |
| Is this another spec-driven framework? | Spec toolkits direct an agent from intent to code [C28]. The unit here is the claim with its evidence, and it covers brand, site, film and copy as well as code. We make no claim that it is better at code. |
| Does it make my agent's code correct? | No. It grades claims, cites sources, flags stale work, and refuses to pass a gate. Tests and checks still run, and their results become evidence. |
| Does it call a model? | No. The process engine and cockpit contain no model-provider calls [C11]. Your agents are the executors. |
| Which agents? | The installer has adapters for Claude Code, Codex, Cline, OpenCode and Prime [C23]. This validation ran the process through the CLI; hook enforcement on other clients has not been exercised (U4). |
| Can I use the code? | Yes, under the GNU Affero General Public License version 3, the license in the repository's LICENSE file [C17]. The AGPL adds a network clause: if you run a modified version as a service, you must offer its source to the people who use it. |
| Won't it bloat my context? | The text always loaded is 12,195 bytes; lens selection reads 7,091 bytes of front matter; a lens body cannot be read before its lens starts [C44][C45]. |
| Who uses it? | Nobody outside the author has been measured. We show a run, not testimonials (U2). |

## CTA architecture
Primary: **Read the run that made this site** (the `actualize/` directory). Secondary: **Replay a worked example** (`python3 tests/check.py`). Tertiary: **Source on GitHub**, with the license named beside it [C17]. "Run it on your product" is allowed since D12 and points at the README's "Using it"; it names the AGPL-3.0.

## Descriptions
- **Short (under 160 characters):** Product Actualizer keeps one graded model of what is true about your product, software or hardware, and refuses to call a launch ready without evidence.
- **Long:** Product Actualizer is evidence-gated product completion for any product that is only partly real, software, hardware, or both. It keeps one Product Model in which every claim carries a grade and a source, runs specialist lenses (brand, experience, marketing, motion, QA and others) in dependency order, and lets only the owner accept the work. Artifacts record the model version they were built from and go stale when a claim they cite changes. A release gate re-checks what it can and can return no-go. It is a set of Markdown skills, a process engine, and an optional local cockpit [C1][C5][C6].

## Voice
Quiet, dense, legible, and dry enough to be funny about systems. Traits with limits: direct, not curt; incisive, not pedantic; witty about habits and systems (a board, a test run, a demo, a launch week), never about a person, a company or a named product, and one joke per beat. Uses: evidence, claim, grade, source, ledger, model, stale, gate, verdict, owner, executor, lens, re-open. Refuses: AI-powered, seamless, effortless, revolutionary, supercharge, 10x, magic, streamline, modern teams, unlock the power of, "trusted by", "just works"; and prove, guarantee, or autonomous about anything the product does not do. Legal and error copy state the fact first.

**How it sells (D19).** Lead with the pain the reader already feels and let the absurdity of the current norm show before the product appears; mechanism and features come after the relief is wanted. Show before telling. Jargon is medicine in small doses: one load-bearing term at a time, introduced by what it does. The narrative: everything around the owner (agents, tools, suppliers, testers) is already conspiring to finish the product, and the cockpit is where that plot is laid out in the open.

## The comparison we own
Four questions every "done" should survive. The middle column is a joke about the habit, never about a person or product; the right column is what the repository does, each cited. No competitor is named and no superiority is claimed (C36).

| question | the usual answer | here |
|---|---|---|
| Says who? | "Trust me." | a source you can re-open on every claim [C2] |
| On the real unit? | "On the render." | a gate that refuses a hardware release until the claim has run on the unit [C73] |
| What changed since? | "Slack, probably." | whatever cites a changed claim is marked stale [C4] |
| Who decides it's done? | "Whatever did the work." | the owner; an agent that tries to accept gets AUTHORITY_HUMAN [C12] |

## Mark brief (for direction and illustration)
A mark that holds at 16 px, one colour, and reversed on dark. It should come from the product's own artefacts: the version stamp `built_from: model@N`, or a claim row with its grade. No gradients, orbs, glow, or confetti (PRODUCT.md "Anti-references"). Architecture: wordmark plus a letterform-grade square mark; one name for everything, sub-products named by what they do.

## Rebuild notes
Rebuilt at model@4 after D10 (language policy). Changes: Added C43 (verified Hacker News statement) and the weight objection (C44, C45); refused words extended; trigger sharpened.

Rebuilt at model@5 after D11: ICP restated by the owner's test; C31 and C55 now cited.

Rebuilt at model@6 after D12: the repository gained a LICENSE (GPL-3.0 as committed; the owner said AGPL-3.0, flagged in U1), so the reuse invitation is no longer withheld and C17 is restated.

Rebuilt at model@7 after D15 (the license event recorded as C68): no content change.

Rebuilt at model@8 after D16: the license is AGPL-3.0 by the owner's instruction; the objection answer and CTA now say so.

Rebuilt at model@9 after D17: the category and position widened from agent-built software to any partly real product, with software as the first buyer and the hardware builder as a second, untested one.

Rebuilt at model@10 after D19 and D20: the voice allows wit aimed at systems and habits; copy leads with pain and the absurdity of the current norm; the comparison to own is the four questions above; film 3 replaces film 2 as the current film.
