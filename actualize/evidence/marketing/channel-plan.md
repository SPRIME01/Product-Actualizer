# Channel plan and measurement (decided before launch; thresholds are decisions, not claims)

Actor: A4 technical founder or small team shipping with coding agents. Where they are, from sources read 2026-10-03:
- Hacker News: item 46612779 ("A directory to discover and install validated Agent Skills"), https://news.ycombinator.com/item?id=46612779
- Reddit r/ClaudeCode: https://www.reddit.com/r/ClaudeCode/comments/1oywsa1/ (thread on skills activation, 2025-12-03)
- DEV Community: the completion post https://dev.to/kentkandiforge/the-last-mile-problem-in-agentic-development-5768 (2026-09-27)
- Vendor docs for skills: https://developers.openai.com/codex/skills, https://cursor.com/docs/skills
- LinkedIn: not evidenced for A4 in this research. Used for A5 (studios) only as a bet.

| channel | actor id | evidence they are there | cost per attempt | continue if | stop if |
|---|---|---|---|---|---|
| Show HN (repository link) | A4 | HN item above | 1 h writing, answering for 6 h | 3 or more people report running a walkthrough | fewer than 5 points and 2 comments after 6 h: do not repost |
| r/ClaudeCode post, after reading its rules | A4 | Reddit thread above | 1 h | replies name a use | removed or ignored: do not retry for 30 days |
| DEV Community article (the dogfood story) | A4 | DEV post above | 3 h | reading time and replies | no replies in 7 days |
| LinkedIn post by the owner | A5 | not evidenced | 30 min | studio replies | none in 7 days |
| Skills directories | A4 | HN item above | 30 min each | accepted | license required: blocked until U1 |

Measurement: no analytics on the site by decision (no third-party scripts, no cookies). The only reads are GitHub traffic and clone counts, stars, and issues. Launch links carry `?ref=<channel>` so GitHub referrer data separates channels. Funnel stage optimised: land to "ran a walkthrough" (self-reported in issues or replies). Everything beyond that is unmeasured (U11).
Not checked: current platform specs for social images (U12); the rules of each community.
