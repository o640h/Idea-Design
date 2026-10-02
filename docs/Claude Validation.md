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

### Bugs To Fix Before User Testing

1. **Enter on a toolbar button edits the selected component.** With a component
   selected, Enter on Substitute (or any bottom-bar button) is caught by the canvas's
   Enter shortcut, which opens the selection for editing and cancels the button press.
   Sofia's substitute text overwrote Main's component. The handler in `canvas.tsx` only
   skips text fields.
2. **Enter on a focused component selects and edits in one press,** so a keyboard
   user's next shortcut is typed into the title.
3. **Connections are announced by their IDs** ("Edge from ef79a0c5-… to …").
4. **New Concept or Import while Compare is open** lands in an empty Compare (confirming
   Codex, and extending it to import).
5. **Add stacks components 24px apart, which causes wrong edits.** Lena's double-click
   on the research question hit the component stacked over it and overwrote it. Undo
   recovered it. Placing the next component beside the last would avoid this.
6. **Outline-made components start under the canvas header:** the first component
   overprints the concept title.

### Friction Worth Fixing Before Recruiting

- **Generated branch names** describe what was replaced ("Instead of Users try the
  app…"), can be ungrammatical ("Without Market stalls use the roadway") and go stale
  once that component is edited.
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

## Does This Make An AI Think Better?

It improves the process, not the underlying ability.

**Where it helped.** Generating alternatives is cheap for a model. Holding a baseline
fixed, varying one thing and honestly listing what broke is not; unaided, a second
alternative quietly changes several things and is never compared. Substitute, Constrain
and Remove make the variation explicit and local, and Review and Compare check it
deterministically. In the pricing session the constraint forced the enterprise tier to
be repaired; in the onboarding session Review exposed a now-meaningless sign-up prompt.

**Where it did not.** Every substitute came from the model's own priors; the structure
changes which question is answered, not what is known. The binding limit is selection
rather than originality: telling a good new idea from a plausible one needs feedback
from reality, which the tool makes visible but cannot supply.

**For agents.** The canvas serves people. For an agent the valuable layer is underneath:
stable IDs, an operation log, branches and a deterministic diff, which together form a
scratchpad that outlives a context window. Coding agents improved partly because code has
git for branching and tests for verification. Idea Design supplies the branching; the
missing half is a falsifiable check attached to each branch.

**For a future ASI.** A stronger system would likely reason over executable models rather
than text cards. As generation gets cheaper, though, human review becomes the bottleneck,
and the durable value is a legible ledger of what changed, what it affects, what was
checked and why a branch won. Codex's proposed experiment, comparing free generation with
plain-text branching and with Idea Design, is the right way to test whether the interface
itself adds anything.

## Artifacts

Persona concepts remain in the Personal workspace: Habit App Onboarding, The Lighthouse
Keeper, Pricing for Lumen Analytics, Riverside Car-Free Weekend Trial, Billing Service
Extraction, Thesis: Remote Work and Innovation, an untitled podcast concept, and two
"Move to Lisbon?" concepts (original and imported copy). Two repro concepts were moved to
Recently Deleted. No implementation-plan checkboxes were changed.
