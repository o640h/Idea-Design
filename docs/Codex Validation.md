# Task 3.4: Ten Simulated User Sessions

Date: 2 October 2026. Status: exploratory review; task 3.4 remains open.

## Overall Assessment

Idea Design has a credible core interaction: preserve a proposal, change a mechanism, inspect the consequences, and compare the resulting versions. Its strongest use in this review was product and systems decisions with several connected assumptions. The weakest use was a first-time user developing alternatives as prose.

The current implementation is worth putting in front of real users. Properly arranging the canvas makes the connected alternatives substantially easier to inspect. This review does not establish that it improves creativity, attracts voluntary use, or is better than existing tools. It establishes that the branch-and-compare mechanics are usable and identifies a few current interaction details worth correcting.

The most important findings are:

1. Different concept descriptions originally produced a comparison that said the branches matched. The follow-up wording fix now explicitly limits comparison to components and connections and says `No component or connection differences` when those match. Concept titles and descriptions remain outside its scope.
2. The full Concepts panel needed wheel scrolling with pinned top controls. That focused fix is now implemented and browser-verified, with no visible scrollbar.
3. My initial layout criticism was overstated: I repeatedly added content without arranging it, then preferred Outline to avoid the work I had left unfinished. The canvas retest below replaces that judgement.
4. Field-level merging, lineage and shared workspaces are already planned. The simulated combining and hand-off cases illustrate why those phases matter; they are not new requirements or blockers for 3.4.
5. The remaining small suggestions concern comparison count units and opening a new concept from Compare.

The follow-up application changes cover panel scrolling/header styling and accurate comparison scope wording. No implementation-plan checkboxes were changed; task 3.4 remains open. The session findings describe the earlier test state.

## Method And Limits

I operated the real application at `http://localhost:3000` in Chrome, using the existing signed-in Personal workspace and local Supabase services. I created fresh concepts prefixed with `Validation`, leaving Claude's earlier concepts intact. Content, relationships, branches, checkpoints and comparisons were created through the visible browser interface. I inspected implementation code afterward to explain observations and distinguish expected limitations from defects.

There were ten role-based sessions across eight concepts. Two concepts had two-person hand-offs: a field-inspection product lead and engineer, and a space-mission lead and systems engineer. Each role had a decision, working preference and competing priorities. These were fictional, plausible decisions, not decisions supplied by ten recruited humans.

The personas were enacted by one AI operator with knowledge of the plan and previous sessions. They cannot provide independent evidence of discovery, unprompted branching, satisfaction, novelty or team dynamics. In particular, switching roles did not reset my knowledge of the interface. I did not invent participant quotes, satisfaction scores or adoption percentages. Judgements about how a persona would value the tool are my hypotheses.

The paired sessions used two tabs under the same account. They exercised asynchronous proposal hand-off and review, not separate-user permissions, authorship or live collaboration. Those capabilities belong to later phases.

Browser actions were accelerated and some were batched. All roles reached Compare during their walkthrough, but these timings are not human first-session measurements. A ten-minute onboarding claim still needs observation with real users. One session deliberately retained its unsuccessful prose-only comparison rather than forcing a successful structured workflow.

Claude's notes informed what to inspect. They are not counted as additional completed sessions or independent corroboration. Browser screenshots and accessibility snapshots supplied the primary evidence here. Two focused existing test files supplied additional verification of the structural engine.

Following the user's correction, I revisited all ten roles' concepts using Canvas, manually arranged the eighteen existing structured branch canvases, and retained the two prose-only branches without forced decomposition. A fresh nineteenth structured branch inherited its arranged baseline and gained a component at a chosen canvas location. This was a follow-up by the same operator, not another ten independent participants. I also corrected a film continuity issue directly on the canvas. Findings below distinguish the initial observations from this retest.

## Coverage

| Session | Role And Working Preference | Decision | Browser Journey | Assessment |
| --- | --- | --- | --- | --- |
| 1 | Maya, product designer; alternatives and visible dependencies | Guest-first or account-first habit onboarding | Outline, labelled connections, Substitute, deletions, Compare, restore, undo | Strong candidate for a concise worked example |
| 2 | Theo, screenwriter; prose, theme and competing endings | Who broadcasts the truth, survives and accepts the cost? | Outline, custom tag, three branches, parent and Main comparisons | Useful version preservation; structure and navigation add friction |
| 3 | Priya, founder; fast capture and evidence-led decisions | Per-seat or per-workspace analytics pricing | Canvas Add, initial Outline links, checkpoint, branch, Compare; arranged canvas retest | Clear pricing/collaboration tension once arranged |
| 4 | Sam, field-app product lead; user needs first | How should inspections work without signal? | Connected baseline, Constrain, local-save proposal, Compare | Constraint makes a previously implicit requirement explicit |
| 5 | Jordan, field-app engineer; failure and consistency first | How do stale status, attachments and conflicting edits change the proposal? | Second tab, branch, edit, Compare, copy into Main, undo; arranged proposal retest | Strong review hypothesis; shared workspace workflow is Phase 8 |
| 6 | Alex, robotics engineer; dependency and validation focus | What follows from removing camera-based detection? | Remove, review ghosts, replacement mechanism, Outline, Compare | Useful dependency audit; no substitute for engineering validation |
| 7 | Nia, community coordinator; unfamiliar with branching, starts in prose | Central repair workshop or travelling sessions? | Concept descriptions, manual branch, prose revision, Compare | Clear failure: different proposals reported as matching |
| 8 | Leo, game designer; experimental mechanics | Real-time countdown or turn-based resource pressure? | Substitute and Remove from one origin, branch chip, dependent edits, Compare | Strong counterfactual exploration; playtesting still decides quality |
| 9 | Elena, space-mission lead; service outcomes and priorities | Maximum capture or priority-region imagery? | Structured baseline, operations branch, Compare | Connects architecture choices to useful delivery |
| 10 | Ravi, spacecraft systems engineer; power, storage and missed contacts | How should previews, raw retention and downlink queues work? | Second tab, sibling branch, relationship edit, branch comparison, whole-component copy and undo | Best demonstration of demand for field-level combining |

## Session Findings

### 1. Product Design: Habit Onboarding

The baseline contained three components: trying the app before registration, inviting registration after a completed habit, and migrating guest history into an account. Two labelled dependency links formed a chain.

Substitute created a separate branch. Changing the first component to account-first onboarding marked the directly connected registration invitation for Review. Guest-history migration, two steps away, was initially unmarked. Deleting the invitation subsequently flagged migration, illustrating that the review surface follows immediate connections to actual changes.

Removing both obsolete steps produced an interpretable comparison: one changed component, two removed components and two removed connections. The summary called this `1 changed / 4 removed`, so its totals are graph items rather than components.

Taking the removed invitation's version restored the component and its connection to the existing onboarding component. It did not restore the other removed endpoint. Undo returned the branch to the preceding state. This is useful, bounded selective recovery.

The reasoning improvement was recognising that an onboarding change also changes data migration and registration timing. Those consequences were reasoned through by the operator; the app preserved and exposed them. It did not evaluate conversion rates or choose the best onboarding model.

This concept is the best candidate for the populated example requested in 3.4. The alternative was renamed `Account First` afterward for readability. It is a prepared local example, not integrated onboarding or proof that a novice discovers the interaction in ten minutes.

### 2. Film: The Last Broadcast

The fictional film has a radio operator, an arriving rescue boat, a final broadcast and a theme about the cost of truth. Production constraints were kept in the concept description. A custom `character` tag worked through the normal tag menu.

Three endings were preserved: the operator broadcasts and dies; she escapes and faces prosecution; or her brother broadcasts while she must live with leaving. The third branch was created from the second. Its default comparison correctly used that parent, and switching the comparison to Main exposed the accumulated differences.

The useful conceptual shift was from assuming death proves moral courage to considering consequences borne by a surviving character. The app made those alternatives available without replacing the original treatment. I cannot attribute that shift uniquely to the app; a disciplined writer could make it in a document.

Creating each branch reset Outline to Canvas. I initially treated that switch and an unarranged component near the header as significant friction. The follow-up arranged Main and both endings into distinct action, rescue, ending and theme areas. Branching remains understandable through the current comparison baseline; fuller lineage is already planned in 4.2. This review no longer recommends prioritising Outline persistence or automatic layout.

The film also exposed a representational risk: changing the ending does not ensure earlier action descriptions are consistent with it. One proposal retained a description about staying at the transmitter while its ending said she escaped. Structural comparison can expose changed text, but thematic coherence requires reviewing the treatment. A component graph is useful here only if it supports writing rather than replacing it with bookkeeping.

In the canvas retest, I resolved that inconsistency by editing the operator's description directly: she powers the transmitter until the recording finishes, then boards the boat, leaving prosecution as the cost. This was a content improvement, not a request for the application to generate continuity corrections. The branch with her brother broadcasting retained its separate action and ending.

Likely combining need: retain a thematic formulation from one ending while keeping another ending's action and dialogue. Whole-component replacement is too coarse for that, although no real writer requested the feature in this simulation.

### 3. Business: Analytics Pricing

The founder captured per-seat pricing, freely inviting colleagues, an enterprise sales requirement and fictional pilot evidence about shared logins. The evidence was explicitly hypothetical, not a real finding about customers.

Repeated Add operations initially placed components close together. I dragged only one aside, left the rest overlapping, and switched to Outline. That was an incomplete use of a freeform canvas, so the initial screenshot did not justify a layout defect. In the retest I moved all four components into a readable arrangement and did the same for Workspace Subscription. The relationships followed the nodes, and the Main layout survived reload.

A named `Seat Pricing Baseline` checkpoint was saved. A `Workspace Subscription` branch then changed pricing and replaced the sales-led enterprise assumption with a self-serve paid plan. Compare showed the two content changes and folded unchanged context.

The useful reasoning was that charging for every collaborator may suppress the behaviour that makes a collaboration product useful, while a sales-led offer conflicts with a tiny team's capacity. The interface did not establish whether workspace pricing is economically viable; the original evidence and assumptions remain important.

The named checkpoint was not available as a direct comparison option. The menu offered the branch origin and Main. This is a present navigation limitation, consistent with the plan deferring broader revision navigation to 4.2, rather than evidence that checkpoint storage failed.

The arranged canvas makes the pricing/collaboration tension visible alongside hypothetical pilot evidence and the team's sales capacity. Arranging content can contribute to reasoning by giving those relationships a readable spatial form. It becomes meta-work only when organisation displaces useful reasoning; my initial refusal to complete the arrangement cannot establish that cost for human users.

### 4. Team Product Lead: Offline Inspections

Sam's baseline assumed online submission, a current coordinator dashboard, report photos and shared editing. Constrain created a constraint component and a `constrains` relationship for completing inspections without signal for six hours.

The constrained submission component was initially marked for review. Rewriting it to local storage plus queued submission made the product direction more concrete. Compare retained the online baseline and showed the added constraint separately from the edited submission mechanism.

The reasoning benefit was separating a requirement from its implementation. Offline work was not just a tag applied to an existing feature: it changed what safely stored, queued and synchronised should mean.

However, the unchanged dashboard, attachment and conflict assumptions still needed work. The graph does not supply those changes automatically. This made the concept a useful hand-off artifact for Jordan's session rather than a finished architecture.

The auto-generated branch name was long and described the source component more than the resulting proposal. It was renamed `Offline Product Proposal`. That is a small task, but repeated naming work matters in a short exploratory session.

### 5. Team Engineer: Offline Consistency

Jordan opened the same concept in a second tab, then branched from the product proposal. The persisted content was present. The engineering pass added a last-sync timestamp to coordinator status, independent resumable attachment queues, and an explicit choice when report edits conflict.

The comparison against the product proposal showed three changed components. The added insight was that offline support changes the meaning of current status and introduces several different synchronisation problems; local report storage alone does not solve them.

The product lead's existing tab did not show the newly created engineering branch until reload. Subsequent inspection of `useSync` confirmed that its pull path fetches operations for already loaded branches, not a refreshed concept/branch catalogue. This records the present same-account test boundary. Shared workspaces, asynchronous review and live presence are Phase 8 work, so I withdraw this as a current team-workflow fix recommendation.

From Main, selecting the engineering proposal as the reference and taking one component worked. Undo restored the baseline. This also showed why a team may want to accept a coherent group of changes: taking only the timestamp component does not make the whole offline design consistent.

The team-value hypothesis is stronger here than a generic brainstorming claim. Each proposal can remain intact while another role inspects consequences. Actual review conversations, authorship, permissions and voluntary hand-offs were not tested.

### 6. Robotics: Remove Camera Detection

The baseline linked camera detection to protective stopping and near-miss footage, with a second-order connection from stopping to throughput. Removing camera detection created a branch with a removed ghost and two directly connected review components. Throughput was initially unmarked; editing the stopping component then exposed it for review.

The candidate alternative used lidar zones for stopping, anonymised intrusion logs instead of footage, and a requirement to measure throughput. This is a materially different concept, with explicit diagnostic trade-offs and unresolved hardware validation.

Remove was valuable because it made the retained design's unsupported assumptions visible. Nevertheless, removing the detection node also removes its relationships. Renaming another component to mention lidar does not construct a complete replacement sensing architecture. Compare helps audit the missing links; it cannot infer that the robot is safe or operationally viable.

A canvas edit attempt selected an edge rather than entering the lower component's text. During subsequent recovery, I also edited the wrong active branch. I restored Main, explicitly selected the alternative, and verified the final comparison. These were automation/navigation mistakes, not evidence of branch-isolation failure. No lost-work defect is asserted from them.

Likely demand beyond copying one version: bring a replacement mechanism and its required relationships together. This aligns with the dependency-aware merging already planned in 4.1.

### 7. First-Time Prose User: Repair Programme

Nia began in the way many nontechnical users plausibly would: one paragraph describing a central workshop, access constraints and decision criteria. A branch changed the description to travelling sessions, transport/setup costs, phone bookings and a small pilot.

These were different proposals, but Compare showed zero changes and stated `Travelling Sessions matches Main`. Returning to Outline and switching to Main verified that the two different descriptions still existed. The failure was comparison coverage, not missing text. The false match also reproduced in the other tab.

`compareConcepts` compares component and relationship arrays; it does not compare the concept's own description or title. The match message therefore overstates what was established.

This session is the clearest challenge to gradual structure. The model permits rough prose, but the central comparison mechanic only becomes useful once the user decomposes that prose into components. If the user must do that merely to receive a truthful comparison, the product is imposing meta-work at its entry point.

For this working style, I would expect a conventional document to be more useful today. That is a hypothesis, not an observed head-to-head result. The immediate fix is truthful comparison coverage or clearly scoped messaging, not prematurely adding AI to force decomposition.

### 8. Game Design: Expedition Pressure

The baseline connected a real-time countdown to risky shortcuts and investigating story clues. The working question was whether tension could survive without penalising slower readers.

Substitute created a turn-based supplies mechanic. Remove then created another alternative from the original countdown, rather than inheriting the supplies change. The Explore chip showed the origin and both alternatives. Choosing the supplies branch and Done retained both branches and kept the selected branch active.

The supplies proposal was refined so reading clues was free while movement and risky actions spent resources. Compare showed the revised mechanic and dependent descriptions, leaving the original design available.

The useful shift was distinguishing pressure from real-time speed. The retained timer-free branch also represented a counterfactual direction that could be revisited. Neither branch's fun, pacing or accessibility was established; those require playtesting.

This was a good fit for Explore's operation vocabulary. A limitation is that Done removes the temporary review overlay even when some consequences remain unedited. It keeps the branch; it is not a statement that the design has been validated. That distinction needs to remain clear in user testing.

### 9. Team Mission Lead: Useful Earth Observation

The mission baseline included continuous full-resolution capture, raw-image downlink, eclipse battery demand, daily priority-region delivery and missing budget evidence. The operations proposal reduced capture to priority regions and scheduled priority imagery ahead of the archive.

Compare made the service trade-off legible: fewer captured bytes might better serve the delivery goal. Keeping the baseline meant that scientific coverage was not silently discarded while operational utility was improved.

The useful change was reconsidering the optimisation target. Maximum acquisition and useful timely delivery are different goals. Explicit relationships helped retain power and downlink consequences while varying that target.

This is a promising fit for the primary team market, but the graph remains qualitative. No contact simulation, energy calculation or queue model was performed. The numbers and feasibility evidence required for a mission decision remain absent.

### 10. Team Systems Engineer: Capture, Compute And Downlink

Ravi opened the mission in a second tab and created a sibling engineering proposal from Main. The proposal added on-board previews, quality-based raw retention, selected-frame requests, missed-contact queue sizing, reduced duty cycle at low charge and additional validation needs. An existing relationship label was also edited.

Compare against Main reported four changed components plus one changed relationship as `5 changed`. The connection change was visible in its own section. Comparing against the operations proposal exposed complementary content: the mission lead's priority-region title could usefully coexist with the engineer's more detailed mechanism description.

Taking the first component's operations version replaced both title and description. Expanding unchanged content confirmed that the engineering description had been replaced by the operations description. Undo restored it. The separately edited relationship remained different; taking an existing component does not copy its relationship changes.

This gives a concrete, present reason for field-level selection and independent relationship acceptance. It is stronger evidence than speculating that teams may eventually want a sophisticated merge tool. It is still an operator-observed need, not a request from a recruited participant.

The synthesis that would best preserve the two contributions is priority-region capture with preview/quality filtering, energy-aware scheduling and selected-frame downlink. The current app requires manually reconciling that synthesis or accepting a whole component and retyping retained detail.

## Canvas Workflow Retest

The follow-up revisited the existing decisions instead of inventing ten new successful sessions. All nineteen component-based branches now have deliberately arranged nodes; the central-workshop and travelling-session branches remain prose-only. All movement used normal browser drag interactions. No database edits, injected positions or automatic layout were used.

| Decision | Canvas Use And Result | Revised Interpretation |
| --- | --- | --- |
| Habit onboarding | Arranged the three-step dependency chain, positioned Account First separately, then created Optional Recovery from Main using Explore → Substitute | The canvas supports creating alternatives from a readable baseline; Outline was not necessary |
| Film endings | Arranged action/rescue/ending/theme areas in all three versions; directly edited the survival branch's inconsistent transmitter action | Spatial organisation helps review story coherence, although it cannot judge dramatic quality |
| Analytics pricing | Arranged pricing, collaboration, sales capacity and pilot evidence in both versions; reloaded Main | Freeform placement works and persists; the original overlapping screenshot reflected unfinished operator work |
| Offline field inspections, both roles | Arranged Main, the product constraint and the engineer's status/photos/conflicts; compared engineer against product lead | Compare still showed three content changes after layout work, rather than counting movement as idea changes |
| Warehouse robot | Arranged detection, stopping, throughput and diagnostics in Main; arranged the three surviving alternative components | The missing sensing links and reduced diagnostic detail are easier to review spatially |
| Expedition game | Arranged countdown/resource mechanics, shortcuts, reading and the playtesting assumption in all three branches | The supplies alternative gives an inspectable mechanism for pressure without hurried reading; the removal branch remains unfinished |
| Earth observation, both roles | Arranged capture, downlink, power, delivery and evidence in all three versions | The canvas helps keep service outcomes and engineering budgets in view while comparing proposals |
| Repair programme | Reopened its prose-only alternative and Compare | The false match remains; arranging unrelated nodes would conceal rather than test this entry style |

The fresh Optional Recovery alternative separated three choices previously bundled into registration: local use, recovery of valuable progress, and later account sync. I edited both dependent components directly on Canvas, added `Test recovery uptake and restore success` by double-clicking empty space, and connected that test to the recovery offer by dragging between node handles. Compare showed three edited components, one added component and one added relationship (`3 changed / 2 added / 0 removed / 2 unchanged`). Reload retained four components, three connections and the layout. This is a useful continuation of the decision, not evidence that the proposal will improve conversion or recovery outcomes.


The changed conclusion is about the role of organisation. A readable arrangement makes connected assumptions easier to inspect, so arrangement itself can be useful work. I should not have counted the result of leaving nodes piled together as evidence that the product forces excessive meta-work. Real-user observation still needs to distinguish useful organisation from time spent polishing without changing a decision.

For film and games, the pipeline helps retain several mechanisms or endings while developing their consequences. For systems and product work, its clearest value is separating a desired outcome, a proposed mechanism, an assumption and evidence still needed. It does not require every thought to become a densely linked graph. The prose-only route is still permitted, and current comparison wording should accurately reflect its coverage.

## Assessment Against Task 3.4

| Criterion | Evidence From This Review | What Remains Open |
| --- | --- | --- |
| Populated example showing branch and compare within ten minutes | Prepared and arranged `Validation 01 — Habit Onboarding`, with Main, Account First and Optional Recovery; checked original and fresh comparisons | Package its first-session entry and observe novice time to a useful comparison |
| Give 5–10 people a real decision, including team pairs; watch unprompted use | Ten simulated roles and two same-account paired workflows were exercised | Recruit actual people with their own decisions; unprompted discovery remains untested |
| Observe organising without improving the idea | Initial unarranged operation biased this judgement; the retest shows organisation making dependencies readable | Observe human reasons and time spent; distinguish useful arrangement from cosmetic work |
| Ask whether it enables thinking existing tools do not | Specific benefit hypotheses were identified for connected counterfactuals and preserved team proposals | Ask humans; no equivalent task was run in their usual tools |
| Fix exposed issues and record demand beyond Take This Version | Panel scrolling/pinned controls fixed and verified; narrow suggestions below; field-level combining already belongs to 4.1 | Actual participant requests, decisions on other small fixes and human retesting remain open |

Nine role walkthroughs produced interpretable component/relationship comparisons; the prose-only walkthrough produced a false match. This is a descriptive result of scripted coverage, not a usability pass rate.

## Current Suggestions Outside The Existing Plan

| Priority | Finding | Reproduction And Evidence | Smallest Useful Response |
| --- | --- | --- | --- |
| Fixed | Match wording overstated comparison coverage | Repair Programme had different concept descriptions but said the branches matched | Compare now explains that only components/connections are compared and uses `No component or connection differences`. Verified with two different prose-only proposals; comparison of concept fields is unchanged |
| Medium | New Concept retains Compare | Create a concept while comparing; empty Compare appears, with title editing unavailable until Back to Canvas | Open a new concept in its editor |
| Low | Count units are ambiguous | Onboarding says 4 removed for two components and two connections; mission says 5 changed for four components and one connection; Optional Recovery says 2 added for one of each | Give separate component/connection totals or label the combined unit explicitly |

The remaining rows are suggestions. The requested panel and comparison wording fixes have been made; comparison count units and New Concept navigation are unchanged.

## Planned Work And Withdrawn Recommendations

| Observation | Existing Plan Or Revised Judgement |
| --- | --- |
| Accepting complementary titles/descriptions and relationships | 4.1 explicitly includes fields, relationships, dependencies, conflict handling and merge preview. The mission example motivates that work without changing its scope |
| Origins, named checkpoints and flat branch navigation | 4.2 explicitly covers lineage and historical comparisons |
| Separate-user workspace hand-offs, branch discovery and presence | 8.1–8.3 cover shared workspaces, asynchronous review and live collaboration. Same-account tabs do not validate that future experience |
| Decomposing rough prose with AI | 6.1 covers editable decomposition. Truthful current comparison wording can be corrected independently |
| More refined alignment and arrangements | 7.4 covers snapping and guides; 10.2 covers suggested arrangements. The current canvas already permits readable manual layouts |
| Repeated Add overlap and an outline-created node near the header | Withdrawn as priorities from this review: I did not complete the manual arrangement before judging it |
| Outline resetting when switching branches | No longer promoted as a pre-validation requirement. The follow-up uses the intended canvas workflow; a preference to preserve Outline does not establish a blocker |
| Long generated branch names | Existing renaming is sufficient for this review. A meaningful name improves the example, but this is not a new requested feature |

## Expected Limits And Unconfirmed Reports

Review is a deterministic immediate-neighbour cue, in either link direction. It does not follow every dependency transitively, interpret the relationship's meaning, or assess whether an edit solves a consequence. Connected second-order effects become visible when their adjacent components are changed. This is consistent with 3.2's explicitly connected scope. Clarifying that scope is preferable to treating it as broken AI inference.

Named checkpoints were absent from the direct Compare selector, but Where It Started loaded successfully. Broad historical revision navigation remains planned for 4.2. Likewise, pairwise comparison, missing team permissions/presence and missing field/relationship merge are planned boundaries, not unexpected regressions.

Curved connections sometimes loop or pass through text in crowded or vertical arrangements. Moving nodes into readable areas substantially improves this. That is normal spatial editing, not evidence of incorrect relationship storage. Outline remains available when a linear representation suits the task.

Claude's initial layout observations also occurred during my unarranged pass, but their interpretation is now corrected above. Mixed comparison counts remain an actionable clarity suggestion. Its inferred second-order-review failure should be interpreted using the immediate-neighbour contract above. Its intermittent lost-components/large-pan event was not independently reproduced here. This review should not turn that report into a confirmed data-loss bug.

Several automation interactions needed recovery: a checkbox/button role mismatch, a lower canvas text target intercepted by an edge, and a duplicate Main target selected while a menu was changing. These do not establish that human clicks are broken. Browser snapshots were used to retarget actions and final states were checked.

The captured console messages included browser-extension warnings and a React Flow attribution warning. No application crash was observed. This was not a full performance, accessibility, offline-recovery or permissions audit.


## Recommended Real-User Validation

Use the arranged onboarding example to introduce the current canvas workflow. The panel fix is complete. Correct the prose match wording, consider the small New Concept navigation correction, and clarify count units; keep richer merging, lineage and collaboration in their planned phases. Automatic layout and preserving Outline are not prerequisites arising from this review.

Then recruit 8–10 people, including at least two pairs with an ongoing shared decision. Let them use their own content. Show the populated example without instructing them to press Branch or Compare on their own problem, then observe whether and why they do so.

Record the time to a useful comparison, materially different alternatives, surfaced assumptions, recovered directions and layout/tagging/naming time. Ask what changed in the decision, whether their usual tools support the same reasoning, and which exact information they wanted to combine across versions. Avoid counting nodes or asking only whether the interface was enjoyable.

For the later comparison experiment, give participants comparable problems in their usual tools and Idea Design, vary order, use equal time, and have independent reviewers assess usefulness, diversity and correctness. For AI, compare unconstrained generation, the same explicit branching process in plain text, and the process in Idea Design. That separates the benefit of deliberate exploration from the benefit of this particular interface.

## Verification And Artifacts

Fresh test concepts remain in the Personal workspace:

- `Validation 01 — Habit Onboarding`: Main, Account First and Optional Recovery.
- `Validation 02 — The Last Broadcast`: Main and two ending alternatives.
- `Validation 03 — Analytics Pricing`: Main and Workspace Subscription, with a saved baseline checkpoint.
- `Validation 04–05 — Field Inspection Team`: Main, Offline Product Proposal and Offline Engineering Proposal.
- `Validation 06 — Warehouse Robot`: Main and the camera-removal alternative.
- `Validation 07 — Repair Programme`: Main and Travelling Sessions, retaining the prose-comparison reproduction.
- `Validation 08 — Expedition Game`: Main and two mechanic alternatives.
- `Validation 09–10 — Earth Observation Team`: Main, Operations Proposal and Engineering Proposal.

These are eight concepts and twenty-one visible branches including Main, from ten initial role walkthroughs and the canvas follow-up. Nineteen branch canvases contain arranged components; two intentionally remain prose-only. Reopening in another tab found the original concepts and stored branch content. Whole-component replacement, bounded restoration and undo were checked in the initial pass. The follow-up verified direct canvas editing, point-based addition, handle-based connection, layout inheritance, content comparison and reload persistence. This was not an exhaustive replay audit of all operations.

Existing focused tests passed in the initial review: `node node_modules/vitest/vitest.mjs run lib/concepts/diff.test.ts lib/concepts/editor.test.ts` — 2 files, 12 tests. They cover comparison identity, isolation, immediate review relationships, selective restoration and editor behaviour.

The follow-up fix uses a vertical scroll container and sticky opaque header, hiding only the Concepts panel scrollbar. Wheel scrolling moved the panel from scrollTop 0 to approximately 632px while the header stayed at the same approximately 65px screen position. The lower concepts and Recently Deleted became reachable and the top icons remained visible. Biome passed for both changed files, TypeScript passed, and the diff was checked. No dependencies, application logic or new test infrastructure were added for this small layout fix.

The comparison wording fix was verified using a fresh temporary prose-only concept with different descriptions in Main and an alternative. Compare displayed its coverage note and `No component or connection differences`, without claiming the branches matched. An existing onboarding comparison still displayed its changed components and connections. The temporary concept was moved to recoverable Trash afterward. Biome and TypeScript checks passed for the fix.

Task 3.4 remains unchecked because actual user observation, unprompted use, reported value against existing tools and participant-requested combining remain untested.
