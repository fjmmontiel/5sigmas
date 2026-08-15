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

This chapter tells how humanity built the mathematical language that would later make computation possible, from the first notches carved into bone to the differential calculus of Newton and Leibniz. By the end, you will understand why notation matters as much as the concepts it describes, how algebra turned unknown quantities into manipulable objects, and how the Greek deductive ideal laid the foundations for step-by-step verifiable reasoning. No prior mathematical background is required, only curiosity about where the tools that computers now execute millions of times per second came from. The thread is always the same: whenever humanity found a way to compress an idea into a symbol, it gained the ability to reason about that idea without having to touch it.

In this chapter we trace an extraordinarily long and decisive process: how humanity moved from marking quantities on physical objects to building a mathematical language capable of describing relationships, proving conclusions and anticipating how the world will behave.

This is not only a history of numbers; it is the history of how human beings apply abstraction.

The profound shift came when we accepted that a mark could stand in for a thing, that a letter could represent an unknown quantity, and that a deduction could be valid even when it did not directly touch any physical object. In that distance between the world and its representation lies an essential part of the intellectual history that would later make computation possible.

---

## 1. We invented languages to describe the world

### Before writing, we were already counting

The need to count is far older than writing. Paleolithic notched objects such as the Lebombo bone and the Ishango bone do not by themselves prove the existence of formal mathematics, but they do show something more basic and more important: very ancient human groups were already using sequences of marks to record, organize or remember quantities ([Royal Society](https://royalsocietypublishing.org/rstb/article/373/1740/20160518/23403/From-number-sense-to-number-symbols-An), [PNAS Border Cave](https://pmc.ncbi.nlm.nih.gov/articles/PMC3421171/), [Royal Belgian Institute of Natural Sciences](https://www.naturalsciences.be/en/museum/exhibitions-activities/exhibitions/250-years-of-natural-sciences/the-ishango-bone)).

That gesture is more profound than it looks. A notch is not a sheep, it is not a day, it is not a bag of grain.
It is a physical representation of any of those concepts. And as soon as you accept that a mark can speak on behalf of something absent, an idea appears that runs through all later history: thinking by operating on symbols.

### Numbers, position and zero

For millennia, different civilizations developed their own ways of representing quantities. The Egyptians used an additive system. The Romans did too. The Babylonians introduced a very powerful positional system. The difference matters because, in a positional system, the value of a symbol also depends on the place it occupies. That idea multiplies the expressive capacity of a small set of signs.

The development of zero requires us to distinguish two historical steps that are often mixed together. One step is to use a mark to indicate an absence inside a positional system.
Another, much more ambitious step is to treat that absence as a number with rules of its own. In India we find both pieces at different times: the Bakhshali manuscript shows a dot used as a placeholder, and centuries later Brahmagupta formulates explicit arithmetic rules for operating with zero as a number ([Oxford GLAM](https://www.glam.ox.ac.uk/article/carbon-dating-finds-bakhshali-manuscript-contains-oldest-recorded-origins-symbol-zero), [Britannica: zero](https://www.britannica.com/science/zero-mathematics), [Britannica: Brahmagupta](https://www.britannica.com/biography/Brahmagupta)).

With that step, numerical representation gains a new generality. We no longer only record concrete quantities. We can build a compact, reusable and formal system for expressing any quantity and operating on it according to stable rules. Later, that tradition would pass into the Islamic world and from there into Europe ([Britannica: zero](https://www.britannica.com/science/zero-mathematics)).

{{ include_html("snippets/from-cave-to-agi/01-sistemas-numeracion.html") }}

### Algebra: operating on what we do not yet know

The next leap is no longer about representing visible quantities, but about reasoning over unknown quantities. In the ninth century, al-Khwarizmi systematized procedures for solving linear and quadratic equations in *Al-Kitab al-mukhtasar fi hisab al-jabr wa-l-muqabala*. The word algebra comes from *al-jabr*, and the word algorithm would later come from the Latinization of his name ([Britannica: The Compendious Book on Calculation by Completion and Balancing](https://www.britannica.com/topic/The-Compendious-Book-on-Calculation-by-Completion-and-Balancing), [Britannica: al-Khwarizmi](https://www.britannica.com/biography/al-Khwarizmi), [MacTutor: Al-Khwarizmi](https://mathshistory.st-andrews.ac.uk/Biographies/Al-Khwarizmi/)).

There is an important precision here. Al-Khwarizmi's algebra is not yet modern symbolic notation. His methods are rhetorical and rely on geometric arguments. But the conceptual shift has already happened: an expression can be transformed step by step, following general rules, until we isolate what we did not know at the beginning.

### Notation compresses thought

Between medieval rhetorical algebra and calculus lies a decisive piece: notation.
François Viète introduced the first systematic algebraic notation, using letters for variables and parameters. A few decades later, Descartes and Fermat took that symbolic compression one step further by connecting equations and geometry.
A curve stopped being only a figure and also became a relationship expressible through symbols ([Britannica: François Viète](https://www.britannica.com/biography/Francois-Viete-seigneur-de-la-Bigotiere), [Britannica: Analytic geometry](https://www.britannica.com/science/analytic-geometry), [Britannica: mathematics / analytic geometry](https://www.britannica.com/science/mathematics/Analytic-geometry), [Britannica: La Géométrie](https://www.britannica.com/topic/La-Geometrie)).

This changes the kind of thinking that can be done. With good notation, a complex idea takes up less mental space. And when an idea fits into compact symbols, it becomes easier to transform, combine and generalize.

{{ include_html("snippets/from-cave-to-agi/01-algebra-despejar.html") }}

---

## 2. Formalizing truth

### Greek geometry and the deductive ideal

The Greeks added something that goes beyond practical calculation: a standard of justification. In the *Elements*, Euclid organizes results from definitions, postulates and chained proofs.
It is not only about reaching a correct conclusion, but about showing why that conclusion follows necessarily from accepted assumptions ([Britannica: Elements](https://www.britannica.com/topic/Elements-by-Euclid), [Britannica: Euclid](https://www.britannica.com/biography/Euclid-Greek-mathematician), [Britannica: Euclidean geometry](https://www.britannica.com/science/Euclidean-geometry)).

That deductive ideal changes the nature of mathematical knowledge. Inside the system, authority no longer lies in tradition, intuition or immediate experience, but in the chain of inferences. Every step can be reviewed and every conclusion can be reconstructed.

{{ include_html("snippets/from-cave-to-agi/01-cadena-deductiva.html") }}

### The power and limit of abstraction

The strength of this approach is enormous. It makes it possible to obtain necessary truths from a formal structure.
But it also has a clear limit: it only works on idealized objects. A geometric line has no thickness; a triangle has no measurement errors. Rigor arises precisely from that distance from the physical world.

This distinction will become crucial later. Mathematics gains power when it abstracts, but science only gains explanatory power when it manages to return from that abstraction to the observed world. The modern history of science consists, to a large extent, of learning to travel that double path well.

---

## 3. Doing science with mathematics

### When nature began to be written in equations

A decisive transformation takes place in the seventeenth century. Galileo mathematizes terrestrial motion, Kepler formulates quantitative laws for planetary orbits, and Newton will bring both lines together in a unified mechanics.
From that point on, nature stops being only something described in words and becomes something that is also expressed through precise mathematical relationships ([Britannica: Galileo](https://www.britannica.com/biography/Galileo-Galilei), [Britannica: Kepler's laws](https://www.britannica.com/science/Keplers-laws-of-planetary-motion), [Britannica: Principia](https://www.britannica.com/topic/Principia)).

The cultural shift is immense.
Understanding no longer means only classifying or narrating, but finding a mathematical structure that can explain and predict.

### Calculus and the description of change

Calculus appears in that context. Newton develops his methods in the second half of the 1660s. Leibniz arrives independently in the 1670s and in 1684 publishes the exposition that would establish much of the notation we still use today ([Britannica: Newton and Leibniz](https://www.britannica.com/science/mathematics/Newton-and-Leibniz), [Britannica: Gottfried Wilhelm Leibniz](https://www.britannica.com/biography/Gottfried-Wilhelm-Leibniz), [MacTutor: Leibniz](https://mathshistory.st-andrews.ac.uk/Biographies/Leibniz/), [Britannica: Isaac Newton](https://www.britannica.com/biography/Isaac-Newton)).

What calculus contributes is a language for describing continuous variation. It makes it possible to formalize rates of change and accumulations. Thanks to it, phenomena such as falling bodies, orbits, changing velocity or the propagation of physical quantities stop being merely observable and become calculable in advance.

That predictive power expands what mathematics can do: it no longer serves only to count, measure or prove, but also to model processes.

{{ include_html("snippets/from-cave-to-agi/01-timeline-representar.html") }}

---

## 4. What these tools made possible

By the end of this period, humanity already has several pieces that would later become indispensable for computation.

- Symbolic systems capable of representing quantities in compact, operable form.
- Algebraic rules for transforming expressions and working with unknowns.
- A deductive ideal that turns reasoning into a verifiable sequence of steps.
- A mathematical language capable of describing relationships, trajectories and continuous change.

None of these pieces was created with computers in mind. Computers were still centuries away. But without them, there would be no way to imagine the next stage: turning these representations and rules into executable mechanical procedures.

The next chapter enters exactly there: at the moment when humanity stops limiting itself to thinking with symbols and begins trying to make a machine manipulate them for us.

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
Because notation changes what is possible to think, not only what is convenient to write. When Viète introduced letters for variables and Descartes connected equations with geometry, they did not merely simplify writing: they opened conceptual territories that had previously been inaccessible. An idea that fits into compact symbols can be transformed, combined with other ideas and generalized in ways that verbal language does not allow.

**What did algebra contribute that verbal or geometric reasoning could not?**
The ability to operate on what is not yet known. Mathematics before al-Khwarizmi solved concrete cases, but each case had to be reasoned through again from the beginning. Algebra introduces a decisive conceptual change: an expression can be transformed step by step, following general rules, until an unknown that did not even have a name at the start is isolated.

**What role did the Greek deductive ideal play in the history of computation?**
It established a standard of justification that computation would inherit centuries later. Euclid did not only organize results: he required every conclusion to follow necessarily from accepted assumptions through verifiable steps. That model of reasoning as a chain of reviewable inferences is exactly what Turing would formalize when describing what it means to compute.

**What does differential calculus have to do with training neural networks?**
A direct connection. Gradient descent, the central mechanism for adjusting a model's parameters, is a direct application of differential calculus: it requires calculating how the error varies when each weight changes, and those quantities are derivatives. Without the language of calculus that Newton and Leibniz developed to describe continuous variation, the algorithm that trains today's models would not exist.
