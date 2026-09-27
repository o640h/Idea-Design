
> **Design ideas. Don’t just write them down.**

## Product Thesis

Idea Design is a Concept Design Environment: software for constructing, exploring, mutating, branching, comparing, and refining ideas as manipulable structures.

Most existing tools treat an idea as text:

> `Idea = note`

Idea Design treats an idea as an evolving object:

> `Idea = structure + relationships + alternatives + history`

The goal is not to have AI think for the user. The goal is to create a cognitive instrument that lets people reason through ideas in ways that are difficult to do purely in their head, on paper, or in a normal notes app.

A useful shorthand:

CAD for concepts.  
Figma for ideas.

## The Core Problem

People can write ideas down easily.

What is much harder is to:

- explore several versions of an idea without losing the original;
- understand what actually changed between two versions;
- move between high-level purpose and low-level implementation;
- expose assumptions and constraints;
- combine mechanisms from different concepts;
- preserve discarded branches without cluttering the current idea;
- compare alternatives without mentally rebuilding them;
- understand how an idea evolved over time.

Current tools mostly store the output of thought.

Idea Design should improve the process of thought itself.

## The Core Object: A Concept

A concept is not just a page.

It can contain flexible components such as:

- Goal — what the idea is trying to achieve
- Principles — rules the concept should preserve
- Mechanisms — how it creates value
- Components — major pieces of the system
- Users / actors — who interacts with it
- Constraints — conditions it must respect
- Assumptions — things currently believed to be true
- Unknowns — unresolved questions
- Alternatives — competing implementations or directions
- Dependencies — what relies on what
- Evidence — information supporting or challenging the idea
- Outcomes — what happens if the concept works

The exact ontology should remain flexible. Early ideas are often vague; the product must not force premature structure.

## Core Interaction Model

The product succeeds or fails on one question:

> **What meaningful operations can a human perform on an idea?**

### Branch

Explore an alternative without destroying the original.

A user might branch:

Individual product

into:

Individual product → Team product

Both inherit the existing concept, then diverge.


### Diff

Compare two branches and understand their conceptual differences, not merely changed text.

Example:

- target user changed from individual → team;
- collaboration became necessary;
- permissions were introduced;
- local-first architecture became harder;
- pricing model changed;
- three original mechanisms remain unchanged.

### Merge

Bring a successful component from one conceptual branch into another without merging everything.

This makes exploration non-destructive.

### Substitute

Hold most of a concept constant while replacing one mechanism.

Example:

subscription model

→

one-time purchase

The user can then inspect what downstream assumptions or components are affected.


### Remove

Temporarily remove part of a concept.

A useful question becomes:

> **Does this idea still work without this component?**


### Constrain

Introduce a limitation and explore its effect.

Examples:

- must work entirely in-browser;
- no recurring subscription;
- one developer must be able to build V1;
- no generative AI;
- privacy must be local-first.

Constraints become active parts of the concept rather than sentences buried in a note.

### Combine

Fuse selected mechanisms or components from two concepts.

This supports deliberate conceptual combination rather than copy-pasting text between notes.

### Abstract

Move upward:

build a better task manager

→

improve personal organisation

→

allocate scarce cognitive resources

Moving upward can reveal entirely different solution spaces.

### Instantiate

Move downward from an abstract idea into concrete mechanisms or implementations.

improve creative reasoning

→

support distant analogy

→

surface structurally similar systems

→

interactive analogy browser

### Analogise

Map the structure of one system onto another.

The software should expose the mapping.

The human decides whether the analogy is useful.

### Rewind

Move backward through the evolution of a concept.

Not simply an undo stack — a navigable conceptual history.

## Semantic Zoom

Semantic zoom is one of the defining mechanics.

The user should not navigate through folders and pages.

They should navigate through levels of abstraction.

Example:

Improve human cognition

↓

Improve creative reasoning

↓

Improve concept generation

↓

Support conceptual exploration

↓

Branch alternative concepts

↓

Compare branches

At each level, the representation changes.

Far view

Shows:

- purpose;
- major branches;
- high-level assumptions;
- key unresolved tensions.

Mid view

Shows:

- mechanisms;
- components;
- relationships;
- alternatives;
- major constraints.

Near view

Shows:

- individual assumptions;
- evidence;
- questions;
- implementation details;
- references.

The goal is not visual novelty.

The goal is to let the user move fluidly between strategy and detail without losing context.


## Concept Lineage

Every concept should preserve where it came from.

A branch should know:

- its parent;
- when it diverged;
- what changed;
- which components were inherited;
- which components were removed;
- what was later merged back.

Over time, an idea becomes an evolutionary tree rather than a pile of documents.

This creates a capability normal notes apps largely lack:

> **Understanding how an idea became what it is now.**

  
## Design-Space Exploration

Idea Design could support structured exploration without becoming rigid.

A concept can expose dimensions such as:

**Purpose**

planning / understanding / execution / learning / creativity

**Representation**

list / spatial / temporal / graph / simulation

**Interaction**

write / manipulate / branch / compare / simulate

**Automation**

none / classify / transform / execute

The user can lock one dimension and mutate another.

Example:

> Keep `representation = spatial`   
> Explore alternative interaction models.

This makes large conceptual spaces easier to investigate systematically.

  

## AI / LLM Role

AI should be subordinate to human reasoning.

The product should not revolve around:

> “Generate me ten ideas.”

That risks replacing exploration with suggestion and can cause users to anchor on model-generated possibilities.

Instead, AI should expose handles for thought.

Useful AI roles

Structure extraction

Turn messy thought into editable conceptual components.

Input:

> “I want software that makes people smarter without thinking for them, probably visual, and branching feels important.”

Possible extraction:

- Goal: cognitive augmentation
- Principle: preserve human reasoning
- Mechanism: external visual representation
- Mechanism: branching
- Constraint: AI is not the primary thinker

The user accepts, rejects, or edits the structure.
  
### Classification

Identify likely relationships such as:

- alternative;
- dependency;
- constraint;
- assumption;
- duplicate;
- contradiction.

### Analogy Retrieval

Find structurally related systems from distant domains.

The AI supplies raw cognitive material, not conclusions.

### Dimension Discovery

Suggest attributes that could be manipulated.

Example:

For a productivity concept:

- unit of work;
- representation;
- planning model;
- feedback mechanism;
- automation level.
  
### Contradiction Detection

Expose tensions such as:

> “This branch requires central cloud processing, but the concept currently contains a local-first privacy constraint.”

### Semantic Diff

Summarise what meaningfully changed between two branches.

### Lightweight Local Inference

Smaller local/browser models could eventually handle:

- classification;
- similarity;
- tagging;
- relationship detection;
- basic decomposition;
- summarisation.

More demanding operations, such as deep cross-domain analogy search, could optionally use stronger cloud models.

AI remains infrastructure, not the product.

## What Idea Design Is Not

Idea Design should resist becoming:

- another Markdown notes app;
- another Notion replacement;
- another mind-map tool;
- another Miro canvas;
- an AI brainstorming chatbot;
- a task manager;
- an enterprise “idea voting” platform;
- an infinite collection of sticky notes.

Text, notes, references, and collaboration may eventually exist inside the product, but they should remain subordinate to concept manipulation. 

## Why It Could Be Valuable

A human mind has limited working memory.

Complex ideas can contain:

- multiple alternatives;
- assumptions;
- uncertain mechanisms;
- contradictory constraints;
- dependencies;
- historical versions;
- different abstraction levels.

Holding all of that internally is difficult.

Idea Design externalises the structure while preserving the user as the thinker.

The product hypothesis is:

> **If conceptual structure becomes directly manipulable, people can explore a larger and more diverse design space than they can through linear writing alone.**

That is the central claim that must be validated.

## Initial Target Users

The eventual product could apply to many forms of conceptual work:

- product design;
- entrepreneurship;
- strategy;
- engineering;
- research;
- writing;
- game design;
- invention;
- systems architecture;
- creative projects.

The strongest initial audience is probably narrower:

> **People designing products, businesses, systems, and complex creative projects.**

These users already work with alternatives, assumptions, trade-offs, and evolving concepts — and better ideas have measurable value.

## Positioning

The product should be easy to explain visually.

Possible positioning:

> **Design ideas. Don’t just write them down.**

> **CAD for concepts.**

> **Figma for ideas.**

The pitch is not:

> “Take better notes.”

It is:

> **“Make ideas directly manipulable.”**

  

## Distribution Advantages

The product could be naturally demoable.

A short screen recording could show:

1. create a concept;
2. zoom into its structure;
3. branch one assumption;
4. mutate the branch;
5. compare both versions;
6. merge the useful component back.

The interface itself explains the product.

This reduces dependence on founder-led content or personal branding.

Sharing Loop

A concept could eventually be shareable as an interactive object.

Someone opens:

> “How I explored twelve versions of this startup.”

They inspect its branches.

Then click:

> **Fork Concept**

That creates a natural Figma/GitHub-style distribution loop.

  

## MVP

Do not build a full knowledge-management platform.

The first version should contain only enough to test the cognitive interaction.

Essential

- create one concept;
- decompose it into editable components;
- semantic zoom;
- branch;
- mutate components;
- compare branches;
- merge selected changes;
- navigate conceptual history.

One AI feature

> **Convert messy thought into editable conceptual components.**

Nothing more is necessary initially.

Avoid:

- calendar;
- task management;
- full notes system;
- mobile app;
- enterprise permissions;
- marketplace;
- advanced collaboration;
- heavy local-model infrastructure.

The first product is an interaction experiment.


## Validation

Traditional startup validation is not enough.

Asking:

> “Would you pay for this?”

before users experience the cognitive mechanic provides weak evidence.

Instead, test whether the product changes thinking.

Example experiment

Give users two comparable design problems.

For one:

> use their normal tools.

For the other:

> use Idea Design.

Then compare:

- number of materially different alternatives explored;
- conceptual diversity;
- novelty;
- usefulness;
- number of assumptions uncovered;
- amount of iteration;
- ability to revisit discarded directions;
- depth of exploration.

Blind external evaluators could rate the resulting concepts.

The most important qualitative question:

> **“Did this let you think in a way your existing tools do not?”**

If the answer is consistently no, the product thesis is wrong.

If the answer is strongly yes, the idea becomes extremely interesting.

  

## Major Risks

### Meta-Work

Users might enjoy organising ideas without actually improving them.

Every interaction should therefore justify itself cognitively.

### Premature Structure

Early ideas are often fuzzy.

The software must allow ambiguity and gradually expose structure rather than forcing users through templates.

### Cognitive Overload

A concept containing hundreds of visible nodes becomes unusable.

Semantic zoom, progressive disclosure, collapsing, clustering, and visual simplification are fundamental.

## Over-Generalisation

A startup, scientific hypothesis, film, and engineering system do not share exactly the same conceptual structure.

The primitives must remain flexible.

### AI Fixation

If AI generates too much of the possibility space, users may simply explore the model’s ideas.

The product must preserve human authorship and exploration.

### Becoming a Notes App

Feature pressure will eventually demand documents, tasks, references, calendars, collaboration, and more.

The product should only add these when they strengthen concept design.

  

## Long-Term Vision

If the core interaction works, a concept could eventually become a first-class digital format.

A concept might contain:

- current structure;
- branch history;
- lineage;
- assumptions;
- alternatives;
- evidence;
- analogy mappings;
- experiments;
- discarded directions;
- eventual implementations.

People could:

- publish concepts;
-  fork concepts;
- explore another person’s branch;
- merge discoveries;
- collaborate on conceptual evolution.

The long-term system begins to resemble:

> **Figma-like manipulation + Git-like lineage + a new medium for conceptual reasoning.**

But none of that matters until the basic instrument proves useful.


## Product Principle

> **AI should not create more thinking for the user.**

> **The software should increase the amount, range, and quality of thinking the user can perform themselves.**

The enduring value of Idea Design would not come from generating ideas faster.

It would come from giving humans a better medium in which to design thought itself.