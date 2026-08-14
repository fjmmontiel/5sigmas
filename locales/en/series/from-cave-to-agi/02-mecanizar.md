---
title: Mechanize — from Babbage to Turing
description: How computation moved from fixed mechanical calculators to programmable general-purpose machines, Boolean circuits and the theoretical foundations of modern computing.
date: 2026-03-26
keywords: "history of computing, Alan Turing, Charles Babbage, stored program, Boolean logic, computer history"
tags:
  - AI
  - History
---

# Chapter 2 — Mechanize (≈ 1640–1956)

Chapter 1 showed how humanity learned to represent quantities and relationships with symbols. The next question follows naturally: **if a procedure is explicit enough, can a machine execute it?**

The answer emerged in layers. First we automated particular calculations. Then instructions became separable from the mechanism. Logic became implementable in circuits. Turing defined computation independently of hardware. Finally, stored-program computers turned general-purpose programmability into working infrastructure.

!!! info "Prerequisite"
    Start with [Chapter 1 — Represent](./01-representar.md) for the symbolic ideas that made mechanical procedures possible.

---

## 1. From calculating to programming

### Fixed-purpose calculators

Pascal's calculator automated addition and subtraction with mechanical gears. Leibniz's Step Reckoner extended mechanical calculation to multiplication and division. These machines were important, but they were not general-purpose computers: the mechanism and the operation it performed were still tightly coupled.

{{ include_html("snippets/from-cave-to-agi/02-limite-calculadoras.html") }}

### Instructions become separable from the mechanism

The Jacquard loom used interchangeable punched cards to control textile patterns. The loom did not understand the pattern; it followed externally encoded instructions. That separation between a reusable mechanism and a replaceable description of behavior is a precursor to programmability.

Charles Babbage pushed the same idea toward general computation with the Analytical Engine. Its design contained recognizable modern concepts: a calculation unit, separate storage, encoded instructions and conditional control flow. The machine was never fully built, but the architecture was no longer a calculator dedicated to one operation.

Ada Lovelace's notes on the Analytical Engine made the conceptual leap even clearer. If a machine manipulates symbols according to rules, then numbers are not the only possible domain. Any information represented precisely enough could, in principle, become material for computation.

---

## 2. Logic becomes engineering

George Boole gave logical relationships an algebraic form. Claude Shannon later showed that the same algebra could describe switching circuits.

{{ include_html("snippets/from-cave-to-agi/02-puertas-logicas.html") }}

This bridge is foundational: true/false relationships become physical switching patterns. Logical operations are no longer only statements on paper; they can be implemented in hardware.

### Turing defines computation

In 1936, Alan Turing described a deliberately minimal abstract machine: a sequence of symbols, a finite set of states and explicit rules for reading, writing and changing state.

{{ include_html("snippets/from-cave-to-agi/02-maquina-turing.html") }}

The abstraction separates **computation** from any particular device. A physical computer can be built from relays, vacuum tubes or transistors, while the underlying procedure can still be discussed at the same formal level.

Turing's work also established that computation has formal limits. Some questions do not have a universal mechanical procedure that always produces an answer. This changed the discipline: more hardware does not eliminate every kind of computational boundary.

### Information becomes measurable

Shannon's 1948 information theory made another essential abstraction. Communication could be studied in terms of symbols, probability, channel capacity and redundancy without requiring the theory to understand the semantic meaning of every message.

That gives modern computing a quantitative language for storage, compression and reliable transmission.

---

## 3. Put the program inside the machine

The stored-program concept moves instructions into the same internal memory system used for data. The practical consequence is enormous: changing the task becomes a matter of changing information in memory rather than physically rewiring the machine.

{{ include_html("snippets/from-cave-to-agi/02-ciclo-von-neumann.html") }}

ENIAC demonstrated large-scale electronic general-purpose computation, although changing programs was still cumbersome. The Manchester Baby then demonstrated execution of a program stored in electronic memory. EDSAC turned the stored-program idea into a practical service used for real scientific work.

This is the point at which the separation between **hardware** and **program** becomes the organizing principle of modern computing.

---

## 4. From computing to artificial intelligence

By the mid-1950s, the necessary substrate existed:

- symbolic logic;
- digital switching circuits;
- a formal theory of computation;
- measurable information;
- electronic memory;
- stored programs;
- general-purpose computers.

The Dartmouth proposal for the 1956 Summer Research Project on Artificial Intelligence could therefore ask a new kind of question. The challenge was no longer whether machines could calculate. It was whether activities such as learning, abstraction, language and problem solving could be described precisely enough to be carried out computationally.

{{ include_html("snippets/from-cave-to-agi/02-timeline-mecanizar.html") }}

AI did not emerge from nowhere. It became thinkable once general computation was both theoretically understood and physically available.

---

## 5. What this period established

The deepest transition was not from gears to electronics. It was from **machines whose purpose is embedded in their mechanism** to **machines whose behavior is described by information**.

That separation allows one physical computer to become a calculator, text processor, simulator, compiler or learning system depending on the program it receives.

---

!!! tip "Continue the path"
    Return to the [From Caves to AGI series overview](./00_presentacion_serie.md). Chapter 3 — *Learn* — will be published as the next completed slice.

## References

- **Britannica** — Pascaline, Step Reckoner, Jacquard loom, Analytical Engine, ENIAC, stored-program concept and EDSAC.
- **Computer History Museum** — Babbage, Ada Lovelace and the Manchester Baby.
- **Claude Shannon (1937)** — *A Symbolic Analysis of Relay and Switching Circuits*.
- **Alan Turing (1936)** — *On Computable Numbers, with an Application to the Entscheidungsproblem*.
- **Claude Shannon (1948)** — *A Mathematical Theory of Communication*.
- **Dartmouth proposal (1955)** — *Dartmouth Summer Research Project on Artificial Intelligence*.

## Frequently asked questions

**What separates a calculator from a programmable computer?**  
A calculator automates a fixed family of operations. A programmable computer represents the procedure separately, allowing the same hardware to execute many different procedures.

**Why was Turing's abstraction important?**  
It defined computation independently of a particular machine and made it possible to reason rigorously about both what can be computed and the formal limits of computation.

**Why does stored-program architecture matter?**  
Because instructions can be stored and changed like data. The machine no longer needs physical reconfiguration every time its task changes.

**How did this lead to AI?**  
Once general-purpose computation existed, researchers could begin asking which cognitive processes might also be represented as explicit computational procedures.
