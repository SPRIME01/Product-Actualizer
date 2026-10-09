built_from: model@10
reads: [actors, capabilities, constraints, positioning, voice, claims, unknowns, jobs, criteria, opportunities]
cites: [C2, C3, C4, C5, C6, C12, C15, C16, C17, C20, C33, C38, C39, C44, C45, C59, C72, C73]
public: true
status: final

# Product Actualizer: one-page brief

**Category:** evidence-gated product completion. **Tagline:** Finish the product. Show the evidence.
**Opening line:** Your agent says it's done. So does the board. The board has never met a customer.
**For:** technical founders and small teams who already build with a coding agent, have a working product, and have an owner who will read a verdict. Second: studios that inherit an agent-built product and must hand over what is true and what is not [C33], and hardware or physical-AI builders with an incomplete unit (untested: no hardware team has run it, U16).
**The change they face:** coding agents made building cheap, so the hard part moved to completing and launching. **Acute pain:** a confident wrong "done", and a working product with nothing to launch it with. **Unnamed pain:** launch material and memory that drift from the product with nothing checking them. **What they do instead of nothing:** build stopgaps, such as test gates and receipt tools.

## The mechanism
1. One ledger, seven grades; every claim has a source anyone can re-open. [C2]
2. A public artifact that cites a claim below OBSERVED is rejected. [C3]
3. Artifacts record the model version they were built from and go stale when a claim they cite changes. [C4]
4. Work is lenses ordered by what each needs; the tools are replaceable executors reported as found or unknown. [C5][C20]
5. An agent cannot accept its own work; the gate can refuse. [C12][C6]

## Proof you can re-open
The validator refusing a downgraded claim, run in your browser on the repository's own file. [C3][C59] Two worked examples, software and hardware, that replay as tests, with mutation checks that must fail. [C15][C16] The run that made this brief. [C39]

## The four questions (the comparison to lead with)
Says who? A source you can re-open on every claim. [C2] On the real unit? For hardware, a gate that refuses a claim that never ran on it. [C73] What changed since? Whatever cites a changed claim is marked stale. [C4] Who decides it's done? The owner; an agent that tries gets AUTHORITY_HUMAN. [C12] Do not name a competitor and do not say it is better; say what it does.

## What it is not
It does not make code correct. It is not a hosted service. It does not ship without an owner reading the verdict. The weight objection is real: the text always loaded is small and lens bodies load only when a lens starts. [C44][C45]

## Three-minute demo narrative
0. (0:00) Scroll to the first section. Let the board play; read the four questions and the right-hand answers. Play film 3 (about 80 seconds) if there is time.
1. (0:30) Open the top of the site. Say the tagline. Point at the live ledger: this is the product's own validator. Downgrade C1; read the refusal aloud. Restore it. [C3]
2. (0:45) The lab: record "Downgrade claim C2". Show the public page and the brand file go stale and the provenance ledger stay current. Try "Rebuild unchanged": refused. [C4]
3. (1:30) Order of work: choose "A launch film with narration"; read the waves; note the gate is always last. [C5]
4. (2:00) Authority: act as the agent, try to accept; read AUTHORITY_HUMAN. [C12]
5. (2:30) Show the run folder: model, decisions, the stale list. End on "Read the run". [C39]
Say plainly at the end: Loam is a fictional example, not a customer. [C38]

## Use cases to lead with
A solo founder with a working app and no launch page (ICP). A two-person team that wants every sentence on the launch page traced to a check. A studio handing an agent-built product to a client with a ledger of what is true. A hardware team (the second worked example is a fictional desk robot whose gate refused unexercised physical claims). [C15][C72]

## Reasons to believe, and their limits
Everything above is a re-openable claim. There are no customers, quotes or outcome numbers; any request for them is answered with the run and the limits. Licensed under the AGPL-3.0. [C17]
