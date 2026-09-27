# Engineering Principles

## Core Principle

Make the smallest correct change that satisfies the requested behaviour.

Optimise for a codebase that remains simple, readable, maintainable, and easy
for a human engineer to understand.

Do not confuse more code, more abstraction, more tests, or more defensive
handling with higher quality.

If an improvement is not necessary to satisfy the request, do not implement it.
Mention it separately afterward if it is worth considering.

## Scope Discipline

- Implement what was requested, not everything that could reasonably be related to it.
- Keep diffs narrow and focused.
- Do not perform unrelated refactors or cleanup.
- Do not add speculative functionality or support hypothetical future requirements.
- Do not add compatibility layers, fallbacks, feature flags, or migration machinery
  unless there is a real requirement for them.
- Do not expand scope simply because additional improvements are possible.
- If requirements are ambiguous in a way that materially changes the implementation,
  ask rather than inventing a larger solution.

## Simplicity

- Prefer the simplest implementation that is correct and maintainable.
- Prefer deleting, consolidating, or reusing code over adding new machinery.
- Prefer explicit code over unnecessary indirection.
- Avoid premature abstraction.
- Do not introduce an abstraction merely to remove a single instance of duplication.
- Do not create wrappers, factories, adapters, interfaces, helpers, or configuration
  layers unless they provide a clear present benefit.
- Do not add a dependency for trivial functionality when the existing stack
  provides an equally clear solution.
- Do not reimplement substantial or specialised functionality merely to avoid
  using a mature dependency.
- Avoid defensive handling for states that cannot realistically occur under the
  project's existing contracts.

Complexity must justify itself.

## Modularity

Keep code modular through clear responsibilities, not through maximum file or
abstraction count.

- Each module should have a clear reason to exist.
- Keep related behaviour together.
- Separate genuinely independent concerns.
- Prefer high cohesion and low coupling.
- Keep dependency direction clear.
- Reuse existing modules and primitives before creating new ones.
- Extract shared code when there is an actual reusable concept, not merely similar syntax.
- Avoid both giant all-purpose modules and excessive one-function/one-component files.
- Do not split code purely to make files shorter.

When modifying existing code, preserve the architecture unless changing it provides
a clear reduction in complexity or is required by the task.

## Local Improvement

Leave touched code slightly better when this can be done safely and with little
additional scope.

Good local improvements include:

- removing code made obsolete by the change
- simplifying a nearby expression or control flow
- improving a misleading name
- removing duplication directly created or exposed by the change
- tightening an obviously unclear module boundary

Do not turn local improvement into a repository-wide refactor.

Prefer iterative evolution of the existing architecture over periodic unnecessary
rewrites.

## Existing Conventions

Before creating a new pattern, inspect the relevant nearby code.

Follow existing project conventions for:

- directory structure
- naming
- component patterns
- state management
- error handling
- styling
- APIs
- tests

Introduce a new convention only when the existing one is clearly inadequate for
the requested work.

Consistency is usually preferable to introducing a theoretically cleaner pattern
in one isolated part of the codebase.

## Naming And Written Copy

Use precise, descriptive names without unnecessary verbosity.

Preserve the exact spelling and capitalisation of product names, brands, domain
terms, and proper nouns.

Example:
- `Frontier Space`, not `Frontier space`

For human-facing headings and titles, use Title Case unless an existing project
style explicitly says otherwise.

For ordinary sentences, use normal sentence case.

Do not silently rewrite established terminology.

## Comments

Comments should explain information that the code itself cannot express clearly.

Good comments explain:

- why a non-obvious decision was made
- important invariants
- external constraints
- surprising behaviour
- meaningful trade-offs

Do not:

- narrate obvious code
- repeat function or variable names in prose
- add comments to every block or function
- add decorative section banners
- write essay-like explanations inside source files
- leave historical commentary that belongs in version control

Prefer clearer code over comments explaining unclear code.

## Documentation

Documentation should be concise and maintained because it is useful, not because
documentation can be generated.

- Do not create new documentation files unless they have an ongoing purpose.
- Update existing documentation when the implementation makes it materially inaccurate.
- Do not document trivial implementation details.
- Document public contracts, architectural decisions, setup requirements, and
  non-obvious constraints where appropriate.
- Keep documentation proportional to the complexity of the feature.

Use architecture documentation only when the task affects architecture.
Use design-system documentation only when the task affects UI/design conventions.
Do not read or rewrite unrelated documentation for every task.

## Tests

Run the smallest relevant set of existing tests for the change.

Add tests when they protect behaviour that was added, changed, or fixed.

- Prefer focused behavioural tests.
- Test meaningful boundaries and regressions.
- Do not generate exhaustive edge-case matrices without a reason.
- Do not duplicate equivalent assertions across many tests.
- Do not add large test suites for small changes.
- Do not introduce new testing infrastructure unless required.
- Do not test implementation details when externally observable behaviour is sufficient.

More tests are not automatically better tests.

## Verification

Before considering a task complete:

1. Check the resulting diff.
2. Remove accidental or unrelated changes.
3. Remove code that became unnecessary.
4. Run relevant existing tests, type checks, linting, or builds where appropriate.
5. Confirm that the requested behaviour is actually satisfied.

Do not run expensive repository-wide validation when a narrower check provides
sufficient confidence.

If verification cannot be performed, say so clearly.

## Error Handling

Handle errors at boundaries where recovery, translation, or useful context is possible.

- Do not catch errors merely to rethrow them unchanged.
- Do not silently swallow errors.
- Do not add fallback behaviour that hides genuine defects.
- Do not validate the same invariant repeatedly across internal layers.
- Trust established internal contracts unless the task requires changing them.

Validate untrusted external input at the appropriate boundary.

## UI/UX Engineering

When working on frontend or UI code:

- Preserve the existing visual language and design system.
- Reuse existing components, tokens, spacing, typography, and interaction patterns.
- Check for an existing component before creating another one.
- Do not redesign unrelated areas while implementing a feature.
- Avoid unnecessary visual decoration and generic generated-UI patterns.
- Keep information hierarchy clear.
- Prefer familiar interaction patterns over novelty without purpose.
- Use semantic HTML where applicable.
- Preserve keyboard usability, focus behaviour, labels, and accessibility.
- Consider responsive behaviour when the affected interface can change size.
- Keep user-facing copy concise.
- Use Title Case for headings and titles unless the project's established design
  language explicitly specifies otherwise.

Visual consistency and interaction clarity are part of correctness.

## Dependencies And Technology

Use the project's existing stack and ecosystem conventions by default, but do not avoid well-established dependencies when they provide a clearly better implementation.

Before adding a dependency:

1. Check whether the capability already exists in the project.

2. Prefer mature, widely used, well-maintained libraries over custom reimplementations when they materially reduce complexity or improve correctness, performance, interoperability, or developer experience.

3. Prefer standard ecosystem tools when they are the conventional solution for the problem.

4. Consider the maintenance and complexity cost introduced by the dependency.

5. Add the dependency when its benefits clearly outweigh that cost.

Do not reimplement substantial functionality merely to avoid adding a reasonable dependency.

Do not add dependencies for trivial functionality that is simpler and clearer to implement locally.

Do not introduce a large framework when a small library or straightforward local implementation is sufficient.

## Architecture Decisions

Do not redesign architecture casually.

For a significant architectural change:

- identify the problem with the current structure
- explain the proposed boundary or responsibility change
- prefer the smallest architecture that solves the present requirement
- consider migration cost and code removed as well as code added

For substantial architectural choices with meaningful long-term consequences,
present the choice before implementing it unless the user has already approved it.

## Repository Hygiene

- Do not modify unrelated files.
- Do not reformat entire files for a local edit.
- Do not rename or move files without a reason.
- Do not leave dead code after replacing behaviour.
- Do not leave temporary debugging output.
- Do not create placeholder infrastructure for possible future work.
- Never modify generated files manually when there is an established generation process.

Prefer diffs that are easy for a human to review.

## Commit Messages

Use Conventional Commits: `<type>(<scope>): <imperative summary>`.
Omit the scope when it adds no clarity. Use types such as `feat`, `fix`, `docs`,
`refactor`, `test` and `chore`.

## Task Completion

When finished, report concisely:

- what changed
- any important implementation decision
- what was verified
- anything genuinely worth considering next

Do not produce a long retrospective unless requested.
