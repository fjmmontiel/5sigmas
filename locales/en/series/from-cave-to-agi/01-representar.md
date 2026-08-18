---
title: Represent — from counting to calculus
description: "How symbols, numbers, algebra and calculus made it possible to represent and manipulate the world, building the mathematical foundation of modern AI."
date: 2026-03-26
keywords: "history of mathematics, symbolic representation, algebra, differential calculus, history of computing, Leibniz Newton, mathematical notation, origins of artificial intelligence"
tags:
  - AI
  - History
video: "01-representar.mp4"
video_duration: "PT1M22S"
---

# Chapter 1: Represent (≈ 43,000 BCE to 1700)

This chapter traces how humanity built the mathematical language that would later make computation possible, from the first notches carved into bone to the differential calculus of Newton and Leibniz. By the end, you will understand why notation matters as much as the concepts it describes, how algebra turned unknown quantities into manipulable objects, and how the Greek deductive ideal laid the foundations for verifiable step-by-step reasoning. No prior mathematical background is required. The central idea is simple: each time people found a way to compress an idea into a symbol, they gained the ability to reason about it without manipulating the physical thing itself.

The process spans tens of thousands of years: humanity moved from marking quantities on physical objects to building a mathematical language capable of describing relationships, proving conclusions and predicting how the world will behave.

This is a history of abstraction, not just a history of numbers.

The decisive shift was accepting that a mark could stand for a thing, a letter could represent an unknown quantity, and a deduction could remain valid without referring directly to a physical object. That separation between the world and its representation became one of the intellectual foundations of computation.

---

## 1. We invented languages to describe the world

### Before writing, we were already counting

The need to count is far older than writing. Paleolithic notched objects such as the Lebombo bone and the Ishango bone do not by themselves prove the existence of formal mathematics, but they do show something more basic: very ancient human groups were already using sequences of marks to record, organize or remember quantities ([Royal Society](https://royalsocietypublishing.org/rstb/article/373/1740/20160518/23403/From-number-sense-to-number-symbols-An), [PNAS Border Cave](https://pmc.ncbi.nlm.nih.gov/articles/PMC3421171/), [Royal Belgian Institute of Natural Sciences](https://www.naturalsciences.be/en/museum/exhibitions-activities/exhibitions/250-years-of-natural-sciences/the-ishango-bone)).

A notch is not a sheep, a day or a bag of grain. It is a physical representation that can stand for any of them. Once a mark can represent something absent, reasoning can operate on symbols rather than on the objects themselves. That idea runs through the rest of this history.

### Numbers, position and zero

For millennia, different civilizations developed their own ways of representing quantities. The Egyptians used an additive system, as did the Romans. The Babylonians introduced a powerful positional system. In a positional system, a symbol's value depends partly on where it appears, greatly increasing the expressive power of a small set of signs.

The development of zero requires distinguishing two historical steps that are often conflated. The first is using a mark to indicate an empty position inside a positional system. The second is treating that absence as a number with rules of its own. India provides evidence of both developments at different times: the Bakhshali manuscript uses a dot as a placeholder, and centuries later Brahmagupta gives explicit arithmetic rules for operating with zero as a number ([Oxford GLAM](https://www.glam.ox.ac.uk/article/carbon-dating-finds-bakhshali-manuscript-contains-oldest-recorded-origins-symbol-zero), [Britannica: zero](https://www.britannica.com/science/zero-mathematics), [Britannica: Brahmagupta](https://www.britannica.com/biography/Brahmagupta)).

This makes numerical representation much more general. Instead of recording only concrete quantities, we can use a compact, reusable formal system to express any quantity and manipulate it according to stable rules. That tradition later passed into the Islamic world and from there into Europe ([Britannica: zero](https://www.britannica.com/science/zero-mathematics)).

{{ include_html("snippets/from-cave-to-agi/01-sistemas-numeracion.html") }}

### Algebra: operating on what we do not yet know

The next step is not simply to represent visible quantities but to reason about unknown ones. In the ninth century, al-Khwarizmi systematized procedures for solving linear and quadratic equations in *Al-Kitab al-mukhtasar fi hisab al-jabr wa-l-muqabala*. The word algebra comes from *al-jabr*, while algorithm later emerged from the Latinization of his name ([Britannica: The Compendious Book on Calculation by Completion and Balancing](https://www.britannica.com/topic/The-Compendious-Book-on-Calculation-by-Completion-and-Balancing), [Britannica: al-Khwarizmi](https://www.britannica.com/biography/al-Khwarizmi), [MacTutor: Al-Khwarizmi](https://mathshistory.st-andrews.ac.uk/Biographies/Al-Khwarizmi/)).

One distinction matters: al-Khwarizmi's algebra was not yet modern symbolic notation. His methods were rhetorical and often supported by geometric arguments. The conceptual shift, however, was already present. An expression could be transformed step by step under general rules until the unknown quantity was isolated.

### Notation compresses thought

Notation is the key development between medieval rhetorical algebra and calculus. François Viète introduced the first systematic algebraic notation, using letters for variables and parameters. A few decades later, Descartes and Fermat extended that symbolic compression by connecting equations and geometry. A curve was no longer only a figure; it could also be represented as a symbolic relationship ([Britannica: François Viète](https://www.britannica.com/biography/Francois-Viete-seigneur-de-la-Bigotiere), [Britannica: Analytic geometry](https://www.britannica.com/science/analytic-geometry), [Britannica: mathematics / analytic geometry](https://www.britannica.com/science/mathematics/Analytic-geometry), [Britannica: La Géométrie](https://www.britannica.com/topic/La-Geometrie)).

Good notation reduces the mental space needed to represent a complex idea. Once an idea can be expressed compactly in symbols, it becomes easier to transform, combine and generalize.

{{ include_html("snippets/from-cave-to-agi/01-algebra-despejar.html") }}

---

## 2. Formalizing truth

### Greek geometry and the deductive ideal

The Greeks added a standard of justification that went beyond practical calculation. In the *Elements*, Euclid organized results from definitions, postulates and chained proofs. The goal was not merely to reach a correct conclusion, but to show why that conclusion followed necessarily from accepted assumptions ([Britannica: Elements](https://www.britannica.com/topic/Elements-by-Euclid), [Britannica: Euclid](https://www.britannica.com/biography/Euclid-Greek-mathematician), [Britannica: Euclidean geometry](https://www.britannica.com/science/Euclidean-geometry)).

That deductive ideal changes the basis of mathematical authority. Within the system, a conclusion does not depend on tradition, intuition or immediate experience; it depends on a chain of inferences. Each step can be checked and the conclusion reconstructed.

{{ include_html("snippets/from-cave-to-agi/01-cadena-deductiva.html") }}

### The power and limit of abstraction

This approach can derive necessary truths from a formal structure, but it also has a clear limit: the structure operates on idealized objects. A geometric line has no thickness and a triangle has no measurement error. Its rigor depends precisely on that separation from the physical world.

This distinction becomes important later. Mathematics gains power through abstraction, while science gains explanatory power by connecting those abstractions back to observations. Much of modern science depends on moving reliably between those two levels.

---

## 3. Doing science with mathematics

### When nature became expressible in equations

The seventeenth century brought a decisive change. Galileo mathematized terrestrial motion, Kepler formulated quantitative laws for planetary orbits, and Newton brought both lines together in a unified mechanics. Nature was no longer described only in words; it could also be represented through precise mathematical relationships ([Britannica: Galileo](https://www.britannica.com/biography/Galileo-Galilei), [Britannica: Kepler's laws](https://www.britannica.com/science/Keplers-laws-of-planetary-motion), [Britannica: Principia](https://www.britannica.com/topic/Principia)).

Understanding increasingly meant finding a mathematical structure that could both explain and predict.

### Calculus and the description of change

Calculus emerged in this context. Newton developed his methods in the second half of the 1660s. Leibniz developed his independently in the 1670s and in 1684 published the exposition that established much of the notation still used today ([Britannica: Newton and Leibniz](https://www.britannica.com/science/mathematics/Newton-and-Leibniz), [Britannica: Gottfried Wilhelm Leibniz](https://www.britannica.com/biography/Gottfried-Wilhelm-Leibniz), [MacTutor: Leibniz](https://mathshistory.st-andrews.ac.uk/Biographies/Leibniz/), [Britannica: Isaac Newton](https://www.britannica.com/biography/Isaac-Newton)).

Calculus provides a language for continuous variation. It formalizes rates of change and accumulation. With it, phenomena such as falling bodies, planetary orbits, changing velocity and the propagation of physical quantities become not only observable but calculable in advance.

That predictive power expands the role of mathematics beyond counting, measurement and proof to the modeling of processes.

{{ include_html("snippets/from-cave-to-agi/01-timeline-representar.html") }}

---

## 4. What these tools made possible

By the end of this period, humanity had several components that would later become indispensable for computation.

- Symbolic systems capable of representing quantities in compact, operable form.
- Algebraic rules for transforming expressions and working with unknowns.
- A deductive ideal that turns reasoning into a verifiable sequence of steps.
- A mathematical language capable of describing relationships, trajectories and continuous change.

None of these ideas was developed with computers in mind; computers were still centuries away. But without them, the next step would have been impossible to formulate: turning representations and rules into mechanical procedures that a machine could execute.

The next chapter begins at that transition, when people stop using symbols only as tools for human reasoning and start trying to make machines manipulate them.

!!! tip "Next chapter"
    [Chapter 2 — Mechanize →](./02-mecanizar.md) — From Babbage to Turing: how we moved from automating specific calculations to designing general-purpose machines capable of executing any program.

---

## 5. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Brief description |
| --- | --- | --- |
| R1 | [Royal Society (2018) — *From number sense to number symbols. An archaeological perspective*](https://royalsocietypublishing.org/rstb/article/373/1740/20160518/23403/From-number-sense-to-number-symbols-An) | Archaeological framework for the transition from physical marks to numerical notation. |
| R2 | [PNAS (2012) — *Early evidence of San material culture represented by organic artifacts from Border Cave, South Africa*](https://pmc.ncbi.nlm.nih.gov/articles/PMC3421171/) | Archaeological context for Border Cave and the notched objects associated with Lebombo. |
| R3 | [Royal Belgian Institute of Natural Sciences — *The Ishango Bone*](https://www.naturalsciences.be/en/museum/exhibitions-activities/exhibitions/250-years-of-natural-sciences/the-ishango-bone) | Institutional description of the Ishango bone and its groups of notches. |
| R4 | [Oxford GLAM — *Carbon dating finds Bakhshali manuscript contains oldest recorded origins of the symbol 'zero'*](https://www.glam.ox.ac.uk/article/carbon-dating-finds-bakhshali-manuscript-contains-oldest-recorded-origins-symbol-zero) | Use of the dot as a placeholder in the Bakhshali manuscript. |
| R5 | [Britannica — *Zero*](https://www.britannica.com/science/zero-mathematics) | Historical distinction between a placeholder and zero as a number. |
| R6 | [Britannica — *Brahmagupta*](https://www.britannica.com/biography/Brahmagupta) | Explicit arithmetic rules for zero and negative numbers. |
| R7 | [Britannica — *The Compendious Book on Calculation by Completion and Balancing*](https://www.britannica.com/topic/The-Compendious-Book-on-Calculation-by-Completion-and-Balancing) | Al-Khwarizmi's foundational role in the development of algebra. |
| R8 | [MacTutor — *Al-Khwarizmi*](https://mathshistory.st-andrews.ac.uk/Biographies/Al-Khwarizmi/) | Etymology of “algorithm” and biographical context. |
| R9 | [Britannica — *François Viète*](https://www.britannica.com/biography/Francois-Viete-seigneur-de-la-Bigotiere) | First systematic algebraic notation. |
| R10 | [Britannica — *Analytic geometry*](https://www.britannica.com/science/analytic-geometry) | Union of algebra and geometry in the Cartesian tradition. |
| R11 | [Britannica — *Elements*](https://www.britannica.com/topic/Elements-by-Euclid) | Euclid and the standard of deductive reasoning. |
| R12 | [Britannica — *Galileo*](https://www.britannica.com/biography/Galileo-Galilei) | Mathematization of motion in the scientific revolution. |
| R13 | [Britannica — *Kepler’s laws of planetary motion*](https://www.britannica.com/science/Keplers-laws-of-planetary-motion) | Quantitative formulation of planetary orbits. |
| R14 | [Britannica — *Principia*](https://www.britannica.com/topic/Principia) | Newtonian unification of mechanics and gravitation. |
| R15 | [Britannica — *Newton and Leibniz*](https://www.britannica.com/science/mathematics/Newton-and-Leibniz) | Independent development of calculus and basic chronology. |

</details>

---

## Frequently asked questions

**Why does notation matter if the mathematical concept already exists?**
Because notation changes what can be reasoned about efficiently, not just what is convenient to write. When Viète introduced letters for variables and Descartes connected equations with geometry, they did more than shorten expressions: they made new forms of symbolic manipulation practical. An idea represented compactly can be transformed, combined with other ideas and generalized in ways that are much harder to perform in prose alone.

**What did algebra contribute that verbal or geometric reasoning could not?**
It made it possible to operate systematically on unknown quantities. Before the algebraic methods associated with al-Khwarizmi, mathematical problems were often solved as particular cases. Algebra introduced the idea that an expression could be transformed step by step under general rules until the unknown quantity was isolated.

**What role did the Greek deductive ideal play in the history of computation?**
It established a standard of justification that computation would inherit centuries later. Euclid did not merely organize results; he required conclusions to follow from accepted assumptions through verifiable steps. That model of reasoning as a chain of reviewable inferences is part of the intellectual background that Turing later formalized when defining computation.

**What does differential calculus have to do with training neural networks?**
The connection is direct. Gradient descent, the central mechanism for adjusting a model's parameters, applies differential calculus by calculating how the error changes as each weight changes; those rates of change are derivatives. Without the language of calculus developed by Newton and Leibniz for continuous variation, the mathematical machinery used to train today's neural networks would not exist.
