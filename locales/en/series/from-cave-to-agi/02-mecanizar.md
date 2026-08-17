---
title: Mechanize — from Babbage to Turing
description: "How humanity automated calculation: from the first physical mechanisms to the separation of program and hardware, and the theoretical foundations of modern computing."
date: 2026-03-26
keywords: "history of computing, Alan Turing, Charles Babbage, Turing machine, ENIAC, Von Neumann, computer history, automated calculation, theoretical computing"
tags:
  - AI
  - History
video: "02-mecanizar.mp4"
video_duration: "PT1M26S"
---

# Chapter 2: Mechanize (≈ 1640 - 1956)

This chapter explains how humanity went from calculating with physical machines to designing general-purpose computers capable of executing any program. By the end, you will understand why separating instructions from mechanism was the decisive conceptual turn in the history of computing, how Alan Turing defined what it means to compute before any modern computer existed, and how Boolean logic stopped being philosophy and became circuit engineering. No technical background is required, although knowing the previous chapter helps. Across those three centuries, progress came not only from better hardware but from reframing what machines could be asked to do.

In the previous chapter we saw how humanity learned to represent quantities, relationships and change with symbols. Once those symbols could be manipulated according to rules, the next question followed naturally: if a procedure is well defined, can a machine execute it?

The answer emerged in stages. First we automated specific operations. Then we learned to encode instructions outside the machine. Later we understood that logic itself could also be expressed mechanically. Finally, we built devices capable of storing programs, executing operations based on conditions, and treating information as a formal quantity.

This chapter follows that path. It is not only the history of how we learned to build computers. It is the history of how we turned abstract procedures into executable processes.

---

## 1. From automating calculations to programming procedures

### The first calculators: automation is not programming

The [Pascaline](https://www.britannica.com/technology/Pascaline), built by Blaise Pascal between 1642 and 1644, automated addition and subtraction through geared wheels. A few decades later, Leibniz's [Step Reckoner](https://www.britannica.com/technology/Step-Reckoner) extended the idea and made multiplication and division possible through mechanical repetitions of simpler operations.

That was an important step, but these were still calculating machines, not computers in the full sense. They executed a specific family of operations. They did not store a general sequence of instructions, could not change their behavior according to intermediate states, and did not clearly separate the mechanism doing the work from the procedure it had to follow.

{{ include_html("snippets/from-cave-to-agi/02-limite-calculadoras.html") }}

### Jacquard: when instructions separated from the mechanism

The next decisive advance did not come from mathematics, but from the textile industry. The [Jacquard loom](https://www.britannica.com/technology/Jacquard-loom), developed in 1804-1805, used interchangeable punched cards to control complex weaving patterns. The machine did not "understand" the pattern. It simply executed a sequence of instructions encoded in an external medium.

This introduced an idea that would shape everything that followed. A machine's behavior can depend on an interchangeable description of steps. This was not yet modern software, but it was a clear precursor to programmability: the mechanism and the instructions stopped being completely fused together.

### Babbage and Lovelace: the general machine before it existed

Charles Babbage took that intuition much further with the [Analytical Engine](https://www.britannica.com/technology/Analytical-Engine). Its design already contains several parts that look familiar today: a calculation unit, separate memory, punched cards for data and instructions, execution that is not strictly sequential, and conditional branching.

The machine was never fully built, but conceptually it was already much closer to a general-purpose computer than to a mechanical calculator. It was not designed for one operation. It was designed to execute different procedures.

In 1843, [Ada Lovelace](https://www.computerhistory.org/babbage/adalovelace/) published her famous notes on the Analytical Engine. They contain what is commonly regarded as the first published program for a computational machine: a procedure for calculating Bernoulli numbers. Her broader insight went further. If a machine can manipulate symbols according to rules, then it is not limited to numbers in the narrow sense. It can operate over any domain that admits a sufficiently precise notation, an idea that anticipates general-purpose computing long before the hardware existed to sustain it.

---

## 2. When logic became engineering

### Boole: giving reasoning an algebraic form

George Boole gave logic an algebraic form in *The Mathematical Analysis of Logic* and developed it more fully in *[An Investigation of the Laws of Thought](https://www.gutenberg.org/ebooks/15114)*. His contribution was to show that propositions and logical relations could be treated with formal operations.

The value of this step is not only mathematical elegance. It turns logical reasoning into something that can be represented rigorously with symbols. From that point on, thinking logically is no longer only a verbal or philosophical activity; it can be described through discrete, manipulable structures.

### Shannon: the bridge between logic and circuits

For decades, Boolean algebra was a brilliant construction with little practical application. The bridge came from Claude Shannon. In his 1937 master's thesis, later published as *[A Symbolic Analysis of Relay and Switching Circuits](https://dspace.mit.edu/handle/1721.1/11173)*, he showed that Boolean algebra could be applied to the design of switching circuits.

That connection was decisive. The problem was no longer only how to reason about true and false on paper, but how to build physical devices that implement logical operations. This is where digital logic becomes the material basis of modern computing. A logical proposition stops being only a form of thought and becomes a way of wiring a machine.

{{ include_html("snippets/from-cave-to-agi/02-puertas-logicas.html") }}

### Turing: defining what it means to compute

In 1936, Alan Turing published *[On Computable Numbers, with an Application to the Entscheidungsproblem](https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf)*. His contribution was not to describe a specific machine, but to isolate what is essential in any mechanical process of calculation: reading symbols, writing symbols, changing state, and following finite rules step by step.

The power of this abstraction is enormous. On the one hand, the Turing machine provides a general model of computation. On the other, it makes clear that computation also has boundaries. There is no general procedure capable of deciding, for every program and every input, whether that execution will halt or continue forever. That result, known today as the *halting problem*, marks one of the most important formal limits in computing.

<details class="s5-optional">
  <summary>Optional extension: why we cannot always know whether a program will halt</summary>

  <div class="s5-optional__body">
    <p>
      We are not talking here about an isolated practical case, such as a badly written program that falls into an infinite loop.
      The claim is much stronger: there is no general method that, given any program and any input,
      can always decide in finite time whether that execution will halt or continue indefinitely.
    </p>

    <p>
      The intuition can be misleading at first. In many concrete cases we can reason about termination.
      We can see, for example, that a counter decreases until zero, or that a recursion has a clear base case.
      What Turing proves is that no universal verifier can exist that works for every possible program.
    </p>

    <p>
      The proof starts by assuming that such a general verifier does exist. Imagine a function
      <code>HALTS(program, input)</code> that always answers correctly:
    </p>

    <pre><code>HALTS(program, input) =
  "yes"  if the program halts
  "no"   if the program never halts</code></pre>

    <p>
      From there we can build another program that uses the verifier and then behaves exactly opposite to what is predicted
      when it analyzes itself. If the verifier says it will halt, it loops forever. If the verifier says it will not halt,
      it stops.
    </p>

    <pre><code>PARADOX(x):
  if HALTS(x, x) = "yes":
    repeat forever
  if HALTS(x, x) = "no":
    halt</code></pre>

    <p>
      The contradiction arises when that program is run on its own code, that is, when we evaluate <code>PARADOX(PARADOX)</code>.
      If the verifier predicts that it halts, then the program enters an infinite loop. If it predicts that it loops forever, then the program halts.
      Either way, we get a contradiction.
    </p>

    <p>
      The conclusion is not that we can never prove that a particular program halts.
      The conclusion is more precise and more important: there is no single automatic universal procedure that solves that question for every case.
      This is one of the first formal boundaries of computation.
    </p>
  </div>
</details>

That result gives computing provable limits. Not every difficult problem is simply a matter of more time or more hardware, because some boundaries arise from the mathematical structure of the problem itself.

{{ include_html("snippets/from-cave-to-agi/02-maquina-turing.html") }}

### Shannon again: measuring information without depending on meaning

In 1948, Shannon changed the framework again with *[A Mathematical Theory of Communication](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf)*. This time the focus was not logical circuits, but information as a measurable quantity. The conceptual shift is deep: to build a general theory of communication, a message has to be analyzed without depending on its meaning.

This gives rise to ideas that are central to everything that follows: compression, channel capacity, redundancy, reliable transmission under noise, and the practical notion of the bit as an elementary unit of information. Modern computing does not only need logic and memory. It also needs a precise theory of how much can be represented, transmitted and reconstructed.

---

## 3. Bringing the program inside the machine

### The stored program: the great conceptual simplification

The next transformation moved instructions inside the machine itself. The [stored-program concept](https://www.britannica.com/technology/stored-program-concept) holds that instructions and data can reside in the same memory and be treated under a common encoding.

The idea became associated with the 1945 *[First Draft of a Report on the EDVAC](https://archive.computerhistory.org/resources/text/Knuth_Don_X4100/PDF_index/k-8-pdf/k-8-u2593-Draft-EDVAC.pdf)* and, over time, with what is called the von Neumann architecture. The practical effect was enormous. Changing tasks no longer required physically rewiring the machine or replacing external mechanisms. It was enough to change the contents of memory.

At this point, the separation between hardware and program stopped being an external intuition, as in Jacquard, and became the organizing principle of the modern computer.

### ENIAC, Baby and EDSAC: the computer stops being an idea

These milestones are often conflated, so the distinction matters. [ENIAC](https://www.britannica.com/technology/ENIAC), completed in 1945, demonstrated that general-purpose electronic computing was physically viable. But reprogramming it was still costly and cumbersome because it depended on panels and wiring.

The [Manchester Baby](https://www.computerhistory.org/revolution/birth-of-the-computer/4/87) became, in 1948, the first machine to execute a stored program from memory. It was an experimental demonstration, not a stable computing service, but it marked a fundamental shift.

[EDSAC](https://www.britannica.com/technology/EDSAC), operational in Cambridge in 1949, turned that principle into a machine useful to real users: the programmable computer as practical infrastructure rather than only an experimental demonstration.

{{ include_html("snippets/from-cave-to-agi/02-ciclo-von-neumann.html") }}

### Dartmouth: when the question moves from computing to thinking

When John McCarthy, Marvin Minsky, Nathaniel Rochester and Claude Shannon drafted the 1955 proposal for the *[Dartmouth Summer Research Project on Artificial Intelligence](https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html)* to be held in the summer of 1956, the technical framework was already in place. Symbolic logic, digital circuits, a theory of computation, quantifiable information and programmable electronic computers all existed.

The new question was no longer whether a machine could calculate; that part was beginning to be settled. It was whether processes such as learning, abstraction, language use or problem solving could also be described precisely enough to be executed by a machine.

AI did not emerge in a vacuum. It emerged when general computation stopped being an aspiration and became a real foundation on which something more ambitious could be imagined.

{{ include_html("snippets/from-cave-to-agi/02-timeline-mecanizar.html") }}

---

## 4. What this period left in place

By 1956, humanity no longer only knew how to represent the world with symbols. It knew how to build machines that manipulated those symbols automatically, repeatedly and generally. We had gone from automating specific calculations to designing devices capable of executing programs, implementing logic, storing instructions and operating on quantifiable information.

That shift changes the central question. From this point on, the problem is no longer how to mechanize calculation, but how to make a machine adjust its behavior from experience, data and objectives. That is the starting point of the next chapter.

!!! tip "Next chapter"
    [Chapter 3 — Learn →](./03-aprender.md) — How a machine can improve from data: from the perceptron and expert systems to the deep-learning revival before 2012.

---

## 5. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Brief description |
| --- | --- | --- |
| R1 | [Britannica — Pascaline](https://www.britannica.com/technology/Pascaline) | Pascal's calculator and its actual capabilities. |
| R2 | [Britannica — Step Reckoner](https://www.britannica.com/technology/Step-Reckoner) | Leibniz's machine and the extension of mechanical arithmetic. |
| R3 | [Britannica — Jacquard loom](https://www.britannica.com/technology/Jacquard-loom) | Punched cards and automated sequences. |
| R4 | [Britannica — Analytical Engine](https://www.britannica.com/technology/Analytical-Engine) | Babbage's design, cards, memory and conditional control. |
| R5 | [Computer History Museum — Ada Lovelace](https://www.computerhistory.org/babbage/adalovelace/) | The 1843 notes, Bernoulli numbers and the idea of programming. |
| R6 | [Project Gutenberg — Boole, *An Investigation of the Laws of Thought*](https://www.gutenberg.org/ebooks/15114) | Classic text on algebraic logic. |
| R7 | [MIT DSpace — Shannon, *A Symbolic Analysis of Relay and Switching Circuits*](https://dspace.mit.edu/handle/1721.1/11173) | The bridge between Boolean algebra and circuits. |
| R8 | [Turing (1936) — *On Computable Numbers*](https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf) | Turing machine, computability and limits. |
| R9 | [Shannon (1948) — *A Mathematical Theory of Communication*](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf) | Foundations of information theory. |
| R10 | [Britannica — Stored-program computer](https://www.britannica.com/technology/stored-program-concept) | The stored-program principle. |
| R11 | [Computer History Museum — *First Draft of a Report on the EDVAC*](https://archive.computerhistory.org/resources/text/Knuth_Don_X4100/PDF_index/k-8-pdf/k-8-u2593-Draft-EDVAC.pdf) | Key document in the spread of the stored-program model. |
| R12 | [Britannica — ENIAC](https://www.britannica.com/technology/ENIAC) | The first major general-purpose electronic computer. |
| R13 | [Computer History Museum — Manchester Baby](https://www.computerhistory.org/revolution/birth-of-the-computer/4/87) | First execution of a program stored in memory. |
| R14 | [Britannica — EDSAC](https://www.britannica.com/technology/EDSAC) | First stored-program computer with regular practical use. |
| R15 | [Stanford / John McCarthy — Dartmouth proposal](https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html) | Foundational text for the 1956 summer project. |

</details>

---

## Frequently asked questions

**What is the difference between automating and programming?**
Automating means mechanically reproducing a specific fixed operation, as the Pascaline did with geared addition. Programming means separating the mechanism that operates from the procedure it has to follow, so that the same machine can execute different procedures without physically rewiring anything. That separation is the conceptual shift from calculator to computer, and Babbage had already anticipated it in the design of the Analytical Engine decades before hardware existed that could sustain it.

**What did Turing demonstrate with the Turing machine before computers existed?**
He showed that it was possible to isolate what is essential to any mechanical process of calculation—reading symbols, writing symbols, changing state and following finite rules—and at the same time showed that this structure has formal limits. The halting problem is not a practical hardware limitation but a mathematical result: no general procedure can always decide whether any arbitrary program will halt or continue indefinitely.

**Why was it so important for instructions and data to share the same memory?**
Because it turned changing a task into a change of content rather than a change of physical structure. Before stored-program computing, reprogramming a machine like ENIAC could require days of rewiring panels. Under the von Neumann principle, it is enough to change what is stored in memory, which makes general-purpose computers possible: the same physical architecture can execute radically different programs.

**What real problem did the stored-program computer solve that earlier calculators could not?**
Calculators mechanized specific predefined operations, useful for repetitive calculations but unable to adapt their behavior to intermediate states or execute conditional logic. A stored-program computer such as EDSAC in 1949 allowed real researchers to present a problem, describe it as instructions stored in memory, and obtain results without rebuilding anything physical, turning computing into reusable practical infrastructure.
