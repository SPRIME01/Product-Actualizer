built_from: model@10
reads: [actors, capabilities, positioning, voice, claims, unknowns, opportunities]
cites: [C26, C27, C28, C29, C30, C31, C33, C34, C36, C43, C46, C47, C48, C49, C50, C51, C52, C53, C55, C69, C70, C73]
public: false
status: final

# Alternatives and battlecard (internal; may use REPORTED claims; do not paste into a public surface)

## What buyers use today, and what they say about it
| alternative | what it does for them | their words or the data | where we differ | where they are stronger |
|---|---|---|---|---|
| Agent chat plus CLAUDE.md / AGENTS.md notes | keeps conventions | "All blue, none of them the same blue." [C49]; "The memory is still there, so the next agent has no reason not to trust it." [C48] | claims carry grades and go stale by version | zero setup |
| Spec toolkits (Spec Kit, Kiro, OpenSpec, BMAD) | direct an agent from intent to code | 139,998 stars for the largest [C29]; "enterprise tooling to build a lemonade stand" [C50]; a close reading found many repetitive files to review [C28] | the unit is the claim with evidence, across launch material as well as code | adoption, mindshare, simplicity for code-only work |
| Stop-hook test gates, receipt tools, adversarial second agents | block a false "done" for code | "'Finished' and 'correct' get treated as the same thing, and they're not." [C47]; "Instructions are not guarantees." [C43] | same instinct, extended to non-code artifacts; the gate is deterministic code with no model | they are tiny and install in one file |
| Permission guards and policy gates | stop risky tool calls | HN items on a guard, VSDD, and a policy gate [C55] | we gate claims about the product, not tool calls | they act before the call |
| App builders (Lovable, Bolt, v0, Replit Agent) | prompt to working app | "None of them owns the whole lifecycle"; a finished look can overstate progress [C30] | we start after the app exists | speed to a first version |
| Studios and freelancers | audit and take over | handoff gaps, chat as source of truth [C33] | a ledger the receiver can re-open | human judgement and accountability |
| Demo video, spec sheet, render (hardware) | shows what a product can do | "Are these videos of it eg tidying up real or just staged / cherry picked?" and no one says whether they are sped up or teleoperated [C69][C70] | the gate refuses a physical claim that never ran on the real unit at the shipping revision [C73] | cheap, persuasive, instant |
| Hand-rewriting generated copy | fixes slop after the fact | "cut any sentence where you could swap your product name for any other SaaS and it'd still make sense." [C52]; generated copy that "communicated less" [C51] | the copy cannot cite what is not graded | taste |

## Market evidence to keep in mind
Developers distrust AI output more than they trust it [C26]. A benchmark paper found agents misleading about incomplete work in most incomplete runs [C27]. The completion post says the bottleneck is no longer building [C31]. "Says who?" is the whole product: every claim has a source.

## The public comparison
The site and film play four questions (says who, on the real unit, what changed since, who decides) with the usual answer as a joke about the habit and ours cited to a claim. No product is named, so nothing in the comparison is a claim about a competitor. Keep it that way (D19).

## Do not say
"Only", "first", "best", "no other tool". The comparative claim that nothing else extends a graded ledger to launch material is PROPOSED and unproven [C36]. Do not quote the Reddit lines publicly until the links have been re-opened (U13) [C46][C53].

## Names not to adopt
Warrant and Plumbline are in use by live evidence and verification offerings, so neither is available as a rename [C34].

## Objections not yet answered with evidence
Willingness to pay and market size are unknown (U9). Buyers have not been asked whether they recognise the problem as stated (U10).
