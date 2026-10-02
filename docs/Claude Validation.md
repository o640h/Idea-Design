# Task 3.4: Ten Simulated User Sessions (Claude)

Date: 2 October 2026. Status: exploratory review; task 3.4 remains open. Companion to
`Codex Validation.md`.

## Overall Assessment

Branch and compare work, and the core idea holds up. The strongest fits were decisions
with connected assumptions: pricing, policy, architecture and reviving a research
framing. A handful of cheap bugs and frictions should be fixed before real people test
it. The biggest gap sits outside the 3.4 checklist: across five of the ten sessions,
people wanted somewhere to record why a branch won or lost.

## Method And Limits

- **One operator, not ten people.** Discovery findings are judgements from inspecting
  the interface, not observations of naive users.
- **Complementary to Codex.** Sessions 4–10 deliberately covered areas Codex did not: a
  same-field edit by a council pair, a 60-component architecture, keyboard-only use,
  reviving a discarded direction, a first-timer's affordance audit, and a personal
  decision handed to a partner.
- **Automation artefacts excluded.** The browser tool's drag skipped pointer moves, its
  typing could beat the 22–32ms before a new component takes focus, and later tabs had
  a display-scaling offset. Suspected bugs were retested to separate these out. The
  earlier report of lost components was withdrawn as one such artefact.
- **Pairs shared one login in two tabs,** because workspace sharing does not exist yet.

## Sessions

| # | Person And Decision | Exercised | Verdict |
| --- | --- | --- | --- |
| 1 | Maya, product designer: account-first or try-first onboarding | Placing, connecting, Substitute, acting on Review, Compare | Would branch and compare unprompted; the generated branch name was useless |
| 2 | Theo, screenwriter: three endings | Outline, custom tags, manual branches, Compare | Branches suit endings; wants a three-way view |
| 3 | Priya, founder: SaaS pricing | Add, tags, checkpoint, Constrain then repair, Compare | Best fit; wants checkpoints in Compare |
| 4–5 | Ana and Kofi, council team: car-free street trial | Two tabs, same-field edits, Remove, reviewing his proposal | Hand-off works; the team loop has gaps |
| 6 | Wei, architect: extract billing (60 components, 69 connections) | Import, Explore and Compare at scale | Fast; the canvas is unreadable at overview zoom |
| 7 | Sofia, keyboard only | The full loop without a mouse | Possible, but one bug overwrote Main |
| 8 | Lena, researcher: thesis question | Checkpoint, reframe, revive, archive, restore | Revival is lossless; Add stacking caused a mis-edit |
| 9 | Marcus, first-timer: studio podcast | Affordance audit of a fresh concept | Discovery depends on noticing Explore |
| 10 | Jess, personal: moving to Lisbon | Outline connections, Constrain, export and import | Clarifying, but the hand-off is a one-way copy |

## Findings

### Friction Worth Fixing Before Recruiting

- **Generated branch names** describe what was replaced ("Instead of Users try the
  app…"), can be ungrammatical ("Without Market stalls use the roadway") and go stale
  once that component is edited. Make the generated names much shorter, so they actually fit on screen too, this applies to the explore toolbar as well.
- **Compare noise:** "Untagged" on every card for people who never tag, and counts that
  mix components with connections. 
- **Compare reads only from your own branch,** so reviewing a teammate's proposal from
  Main reads backwards. A swap-sides control would fix it.
- **Explore exits:** Done keeps branches even when nothing changed; Discard by Esc is
  silent and has no undo.
- **Outline:** each branch switch returns to the canvas, and the Outline cannot Explore.
- **Review on hub components:** 15 flags with no list or bulk dismissal, and direction
  is ignored even though "depends on" has one. One-step Review matches the 3.2
  specification.

### Already Planned

Cross-tab and team branch visibility and silent remote edits (Phase 8), checkpoints in
Compare and lineage (4.2), export of branches (4.2), filtering and zoom levels at scale
(5.2), combining across concepts (10.1) and field-level merging (4.1).

### Not In The Plan

- **A rationale or decision note per branch** (Maya, Priya, Wei, Lena, Jess). This is
  the strongest cross-session theme.
- **Comparing more than two versions** (Theo).
- **Weighing factors** (Jess).
- **Sources attached to evidence** (Lena).

## Assessment Against Task 3.4

| Criterion | Status |
| --- | --- |
| Populated example concept | Still to build; Codex's arranged onboarding concept is the right base |
| 5–10 real people, including pairs | Not done. Pairs cannot share a concept yet, so decide between one shared login and recording authorship manually |
| Unprompted branching and comparing | Likely for people choosing between options; risky for newcomers, because Explore enables only after selection and is explained only in a tooltip |
| Organising instead of improving | Real but small: arranging stacked Adds, renaming branches, re-choosing the Outline |
| Thinking existing tools do not support | Clearest with Constrain-then-repair and revived framings; weakest for prose-heavy work |
| Wanted beyond Take This Version | Yes: single fields, and combining proposals across people and copies |