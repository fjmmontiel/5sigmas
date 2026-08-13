---
title: Represent — from counting to calculus
description: How symbols, numbers, algebra, proof and calculus created the mathematical language that later made computation possible.
date: 2026-03-26
keywords: "history of mathematics, symbolic representation, algebra, calculus, history of computing, mathematical notation, artificial intelligence history"
tags:
  - AI
  - History
---

# Chapter 1 — Represent (≈ 43,000 BCE to 1700)

This chapter follows the construction of the mathematical language that would eventually make computation possible: from marks that stand for quantities to algebraic unknowns, deductive proof and calculus. The thread is the same throughout: **whenever an idea can be compressed into a symbol, we gain the ability to reason about the symbol without manipulating the physical object itself.**

No mathematical background is required. The goal is to understand why notation and abstraction are not cosmetic additions to mathematics; they change what kinds of thought can be performed reliably and repeatedly.

---

## 1. We invented languages for describing the world

### Before writing, we were already recording quantity

Counting is older than writing. Paleolithic objects with repeated notches, such as the Lebombo and Ishango bones, do not prove the existence of formal mathematics, but they do show something fundamental: humans were using physical marks to record or organize quantities long before written numerals existed.

A notch is not a sheep, a day or a bag of grain. It is a **representation** that can stand in for any of them. Once a mark can represent something absent, reasoning can begin to operate on symbols instead of only on objects.

### Number systems, position and zero

Different civilizations developed different numerical representations. Additive systems use repeated symbols. Positional systems add a much more powerful idea: the value of a symbol depends on where it appears.

That change gives a small set of symbols enormous expressive range.

{{ include_html("snippets/from-cave-to-agi/01-sistemas-numeracion.html") }}

The history of zero contains two separate conceptual steps. First, a placeholder marks an empty position inside a positional notation. Later, zero becomes a number with arithmetic rules of its own. The Bakhshali manuscript preserves an early placeholder notation, while Brahmagupta later formulated explicit arithmetic involving zero and negative numbers.

With positional notation and zero, written numbers become compact, general and systematically manipulable.

### Algebra: reasoning about what we do not yet know

The next leap was to represent unknown quantities. In the ninth century, al-Khwarizmi systematized methods for solving linear and quadratic equations. His algebra was still rhetorical rather than written in modern symbolic form, but the conceptual move was already there: **a relationship can be transformed according to general rules until an unknown quantity becomes explicit.**

{{ include_html("snippets/from-cave-to-agi/01-algebra-despejar.html") }}

Centuries later, François Viète introduced systematic letter-based notation for variables and parameters. Descartes and Fermat then connected algebra to geometry. A curve could be both a shape and a symbolic relationship.

That compression matters. Good notation reduces how much working memory a complicated idea consumes. Once a relationship fits into compact symbols, it becomes easier to transform, combine and generalize.

---

## 2. Formalizing justification

### The deductive ideal

Greek mathematics added a standard that went beyond useful calculation: **show why a conclusion follows**.

Euclid's *Elements* organizes geometry around definitions, postulates and chains of inference. The important change is epistemic. A mathematical statement is not accepted only because it looks right or works in a particular example. Its justification can be reconstructed from explicit starting assumptions.

{{ include_html("snippets/from-cave-to-agi/01-cadena-deductiva.html") }}

This idea will matter much later for computation. A repeatable procedure needs each step to be explicit enough that another person—or eventually a machine—can execute it without relying on hidden intuition.

### The power and limit of abstraction

Formal mathematics gains precision by working with idealized objects. A geometric line has no thickness. A perfect circle has no manufacturing error. That distance from physical reality is a feature: it makes exact reasoning possible.

But it also creates a second problem. To explain the real world, formal relationships eventually have to reconnect with observation and measurement. Modern science becomes powerful when it learns to move in both directions:

> **world → mathematical representation → deduction / calculation → prediction about the world**

---

## 3. When nature became mathematical

### Equations as models of physical processes

The seventeenth century produced a major shift. Galileo expressed terrestrial motion quantitatively. Kepler described planetary motion with mathematical laws. Newton later connected terrestrial and celestial mechanics inside a unified mathematical framework.

Understanding increasingly meant more than describing or classifying. It meant finding a mathematical structure that could explain observations and predict what would happen next.

### Calculus: a language for change

Calculus emerged in that setting. Newton developed his methods during the 1660s; Leibniz developed them independently in the 1670s and published notation that strongly influenced what is still used today.

Calculus provides a language for two ideas that appear everywhere in physical systems:

- **rate of change** — how fast a quantity is changing now;
- **accumulation** — how small changes add up over an interval.

That makes trajectories, varying speed, growth and many other continuous processes calculable rather than merely observable.

---

## 4. What representation made possible

By the end of this period, several pieces required by later computation already exist:

- compact symbolic systems for quantities;
- algebraic rules for transforming expressions and unknowns;
- deductive reasoning expressed as reviewable steps;
- mathematical models of physical relationships;
- calculus for describing continuous change.

{{ include_html("snippets/from-cave-to-agi/01-timeline-representar.html") }}

None of these tools was invented for computers. Yet without them, the next historical step would be difficult even to formulate: **can the manipulation of symbols itself be mechanized?**

That question leads from mathematical representation to machines, algorithms and eventually general-purpose computation.

---

!!! tip "Continue the path"
    Return to the [From Caves to AGI series overview](./00_presentacion_serie.md). Chapter 2 — *Mechanize* — will be published as the next completed slice.

## References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

- **Royal Society (2018)** — archaeological perspective on the transition from number sense to number symbols.
- **PNAS (2012)** — archaeological context for marked artifacts from Border Cave.
- **Royal Belgian Institute of Natural Sciences** — institutional description of the Ishango bone.
- **Oxford GLAM** — dating and interpretation of the zero placeholder in the Bakhshali manuscript.
- **Britannica** — zero, Brahmagupta, al-Khwarizmi, Viète, analytic geometry, Euclid, Galileo, Kepler, Newton and Leibniz.
- **MacTutor History of Mathematics** — historical context for al-Khwarizmi and Leibniz.

</details>

## Frequently asked questions

**Why is notation more than shorthand?**  
Because compact notation reduces the mental cost of representing a relationship. That makes transformations and combinations that would be cumbersome in prose much easier to perform and verify.

**What did algebra add beyond arithmetic?**  
Arithmetic manipulates known quantities. Algebra lets a symbol stand for an unknown quantity and provides rules for transforming the relationship until the unknown becomes explicit.

**Why is deductive proof relevant to computing?**  
Both depend on explicit steps. A procedure that can be reconstructed from formal rules is much closer to something that can eventually be mechanized.

**What did calculus add?**  
A compact mathematical language for continuous change and accumulation, allowing physical processes to be modeled and predicted quantitatively.
