---
title: Learn — from rules to data
description: "How AI moved from hand-written rules to learning from data: expert systems, statistics, neural networks and the AlexNet breakthrough."
date: 2026-03-27
keywords: "machine learning history, expert systems, MYCIN, history of machine learning, backpropagation, AlexNet, AI winters, symbolic AI, perceptron, deep learning history"
tags:
  - AI
  - History
  - LLMs
---

# Chapter 3 — Learn (≈ 1956–2012)

This chapter explains how AI moved from writing expert knowledge by hand, rule by rule, to inferring it automatically from data. By the end, you will understand why expert systems worked well for years and then hit a ceiling, what conceptual shift statistical learning introduced by reframing the problem as optimization rather than formalization, and how backpropagation made multilayer neural networks systematically trainable. The chapter runs from symbolic AI and the field's winters to AlexNet in 2012. No technical background is required, although Chapters 1 and 2 on representation and mechanization are useful prerequisites.

The Dartmouth Conference did not unveil a finished technology. It launched a research program. Its hypothesis was ambitious: if human reasoning could be described precisely enough, a machine could execute it too. The following decades showed that this idea was not absurd, but that it was far harder than it first appeared.

This chapter follows the period in which AI gradually moved away from relying mainly on hand-written rules and toward data, statistics and optimization. The change was neither clean nor instantaneous. Different approaches coexisted for a long time, with partial successes and very different limitations. Still, the overall direction eventually became clear: the field moved away from asking how to enumerate correct reasoning explicitly and toward asking how a machine could extract useful regularities from examples.

---

## 1. The age of rules: when intelligence was written by hand

### The first symbolic systems

Early AI programs were built around a powerful intuition: if reasoning can be expressed as a sequence of formal steps, perhaps we only need to represent those steps and let the machine traverse them. Systems such as [Logic Theorist](https://bitsavers.org/pdf/rand/ipl/P-868_The_Logic_Theory_Machine_Jul56.pdf), presented in 1956, and [GPS, the General Problem Solver](https://iiif.library.cmu.edu/file/Simon_box00064_fld04907_bdl0001_doc0001/Simon_box00064_fld04907_bdl0001_doc0001.pdf), described in the late 1950s and early 1960s, followed this direction. Both demonstrated something important: a machine could search, combine rules and produce non-trivial chains of inference.

The problem was that these systems performed best where the world was already highly formalized. Theorems, games and puzzles admit relatively clean states, rules and goals. The real world almost never does.

### Expert systems: the mature symbolic paradigm

This approach reached its most solid form in expert systems. Rather than aiming for general intelligence, they tried to capture knowledge in a narrow domain through rules, facts and heuristics constructed with human specialists.

[MYCIN](https://www.shortliffe.net/Buchanan-Shortliffe-1984/Chapter-30.pdf), developed at Stanford in the 1970s, became one of the best-known examples. It recommended treatments for serious bacterial infections and showed that a rule-based system could perform at a high level inside a tightly bounded domain. [XCON, also called R1](https://cdn.aaai.org/AAAI/1980/AAAI80-076.pdf), automated VAX computer configuration at Digital Equipment and became one of the most cited industrial examples of the period.

What matters about these systems is not only that they worked, but why. They worked well when the domain was relatively stable, when the decision vocabulary could be bounded and when expert knowledge could realistically be converted into maintainable rules.

{{ include_html("snippets/from-cave-to-agi/03-simbolica.html") }}

### Why that path eventually hit a ceiling

The limitation appeared when knowledge stopped being small, stable and easy to formalize. Maintaining an expert system did not mean writing the rules once. It meant revising them, extending them, resolving conflicts among them and absorbing exceptions. As the domain grew more complex, so did the knowledge base.

This exposed one of symbolic AI's major bottlenecks: knowledge acquisition. Extracting expert knowledge and translating it into a formal base was expensive, slow and fragile. The problem was not only computational. It was also human and organizational.

The so-called AI winters are closely related to this collision between promise and reality. The first was tied to inflated expectations, complexity barriers and institutional criticism such as the [1966 ALPAC report and the 1973 Lighthill report](https://publications.jrc.ec.europa.eu/repository/bitstream/JRC120469/jrc120469_historical_evolution_of_ai-v1.1.pdf). The second, in the late 1980s and early 1990s, is commonly associated with exhaustion of the expert-system paradigm, the knowledge-acquisition bottleneck and the collapse of the Lisp-machine market that had supported much of that ecosystem ([JRC AI Watch](https://publications.jrc.ec.europa.eu/repository/bitstream/JRC120469/jrc120469_historical_evolution_of_ai-v1.1.pdf)).

{{ include_html("snippets/from-cave-to-agi/03-inviernos-ia.html") }}

---

## 2. The statistical turn: learning from examples

The paradigm shift was not simply about using more data. It changed the central question. Instead of asking which rules had to be written to solve a task, researchers increasingly asked which regularities a model could infer if it were shown enough examples.

### Generalize without memorizing

Learning means capturing a regularity that continues to work outside the training set, not merely reproducing it. This problem—generalization—became central with the rise of statistical learning.

[Vapnik's statistical learning theory](https://link.springer.com/book/10.1007/978-1-4757-3264-1) offered a language for reasoning about capacity, empirical risk and control of overfitting. In parallel, [Valiant](https://people.mpi-inf.mpg.de/~mehlhorn/SeminarEvolvability/ValiantLearnable.pdf) formalized learning as the acquisition of knowledge without explicit programming. Machine learning therefore began to consolidate not as a collection of tricks, but as a discipline with foundations addressing what can be learned, with how much data and under what conditions.

Probability also stopped being an accessory and moved to the center. In many domains, a system does not only need to decide. It also needs to represent uncertainty, combine incomplete evidence and update its beliefs when new data arrives.

### Optimize parameters instead of writing rules

If a model learns from examples, its parameters must be adjusted to reduce error. That idea feels obvious today, but it reorganized the entire field. Learning increasingly became an optimization problem.

The classic precursor to stochastic optimization already appears in [Robbins and Monro (1951)](https://www.columbia.edu/~ww2040/8100F16/RM51.pdf). Later, stochastic gradient descent made it possible to train models on large datasets without recalculating the error over every example at each step. Regularization and validation techniques were added so that a model would not only fit the past well, but preserve its ability to generalize.

Neural networks were not the field's only focus during this phase. Decision trees, kernel methods, probabilistic models and ensemble techniques also grew. The underlying shift was not yet “everything is deep learning.” It was that many tasks were starting to be described more naturally as statistical fitting problems than as lists of hand-written rules.

### Representation is learned too

This is where the decisive difference between many classical methods and deep networks appears. In many earlier approaches, a human had to design much of the relevant feature representation manually. The model learned from those features, but it did not learn the representation itself very well.

Multilayer neural networks promised something more ambitious: useful intermediate representations learned directly from data. The idea had existed for much longer, but for years it was difficult to turn into a robust practice.

{{ include_html("snippets/from-cave-to-agi/03-bucle-entrenamiento.html") }}

---

## 3. The perceptron, its critique and the return of neural networks

### The first neural excitement

Rosenblatt's perceptron first appeared as a proposal in 1957 and was formalized more fully in his 1958 paper, [*The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain*](https://www.ovid.com/00006832-195811000-00007). It was one of the first influential formulations of a trainable artificial neuron.

The promise was powerful: a machine could adjust weights from examples and learn a decision boundary rather than receiving it fully specified. This opened a path distinct from symbolic AI. Instead of explicitly representing chains of inference, the system adjusted parameters to discriminate patterns.

### Minsky and Papert's critique

The classic critique came with [Minsky and Papert's *Perceptrons*](https://mitpress.mit.edu/9780262630221/perceptrons/) in 1969. Their analysis showed important limits of single-layer perceptrons and used XOR (exclusive OR) as a central case: an operation that returns 1 only when its two inputs differ and 0 when they are equal. It is the simplest Boolean function that a one-layer perceptron cannot learn, because its four possible cases occupy the corners of a square in a pattern that no straight line can separate correctly.

The problem was not that the analysis was wrong. The problem was that for years it was interpreted as a much broader practical rejection than it actually demonstrated. In time, it became clear that a network with hidden layers could represent functions beyond the reach of a simple perceptron. The difficulty was not only representational. It was also a training problem.

### Backpropagation and multilayer networks

That obstacle began to break when training deep networks stopped being a vague intuition and became an operationally convincing recipe. The 1986 paper by [Rumelhart, Hinton and Williams](https://gwern.net/doc/ai/nn/1986-rumelhart-2.pdf) made error backpropagation the emblematic procedure for adjusting multilayer networks. The idea was to propagate error backward from the output to estimate how each weight should change.

The principle had earlier precedents, but 1986 was the inflection point that made it central to the neural-network community ([history of backpropagation](https://people.idsia.ch/~juergen/who-invented-backpropagation.html)). From then on, neural networks were no longer only a biologically inspired promise. They became a family of models that could be trained with a general technique.

{{ include_html("snippets/from-cave-to-agi/03-problema-xor.html") }}

---

## 4. NLP before transformers

Natural-language processing followed a trajectory for a long time that was very different from the one transformers would later impose. Before large neural models, statistical and sequential approaches dominated the field.

[N-gram models](https://web.stanford.edu/~jurafsky/slp3/3.pdf), whose lineage partly traces back to Shannon's ideas about sequences, estimated the probability of a word from a small number of preceding words. They were simple, effective and extremely useful, but had an obvious limitation: their effective memory was short.

[Hidden Markov models](https://www.cs.ubc.ca/~murphyk/Bayes/rabiner.pdf) dominated tasks such as speech recognition and sequence labeling for years. Later, [conditional random fields](https://daiwk.github.io/assets/Conditional%20random%20fields%20Probabilistic%20models%20for%20segmenting%20and%20labeling%20sequence%20data.pdf) provided a powerful alternative for segmenting and labeling sequences while relaxing some strong HMM restrictions.

All of these approaches were valuable, but they shared a deeper limitation: they handled local correlations and tractable probabilistic structures well, but they did not learn deep contextual representations of language. Long context, semantic ambiguity and open-ended composition remained difficult.

{{ include_html("snippets/from-cave-to-agi/03-nlp-pre-transformer.html") }}

---

## 5. The neural renaissance: what changed before 2012

The resurgence of deep learning cannot be explained by one cause. It was the convergence of several changes that had remained incomplete for decades.

### More data, more compute, better shared benchmarks

First came scale. The mass digitization of text, images, audio and online activity produced volumes of data that earlier approaches had rarely been able to exploit. In vision, [ImageNet](https://image-net.org/static_files/papers/imagenet_cvpr09.pdf) turned that scale into concrete infrastructure for comparative research.

Then came suitable hardware. GPUs, designed for intensive parallel computation, matched the linear algebra of neural-network training unusually well. The change was operational: models that had seemed interesting but impractical for years could now be trained in reasonable time.

Shared benchmarks were also necessary to measure progress. Without common benchmarks, every group can look strong on its own problem. With benchmarks, progress becomes visible, comparable and cumulative.

### The immediate prelude to the explosion

Before AlexNet there was an important prologue. Work such as [*Reducing the Dimensionality of Data with Neural Networks*](https://www.cs.toronto.edu/~hinton/absps/science.pdf) in 2006 and [*Greedy Layer-Wise Training of Deep Networks*](https://proceedings.neurips.cc/paper/3048-greedy-layer-wise-training-of-deep-networks.pdf) in 2007 helped reopen the problem of training deep networks when it was still unclear whether they could scale reliably from direct initialization.

That period did not solve everything, but it changed the intellectual climate. Deep networks stopped looking like a historical curiosity and began to recover empirical credibility.

### 2012 as a threshold

The natural endpoint of this chapter is 2012. [AlexNet](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) trained a deep network on 1.2 million ImageNet challenge images using two GTX 580 GPUs for 5–6 days, together with several design choices that already pointed toward the next phase.

The improvement was large enough to redirect the field. AlexNet did not single-handedly inaugurate the entire modern era, but it marks the threshold after which deep learning stopped being one promising line among several and became the dominant axis of progress in vision and, soon afterward, speech and language.

---

## 6. What this period prepared

By 2012, AI had changed profoundly. It had not completely abandoned rules or logic, but it no longer treated them as the primary route to building capable systems at scale. The center of gravity had shifted toward models that learn from data, adjust parameters and improve as examples, compute and representation quality grow.

That shift prepares the ground for the next chapter. The story is no longer mainly about whether a machine can learn from data, but about what happens when that learning finds enough scale.

!!! tip "Next chapter"
    [Chapter 4 — Scale →](./04-escalar.md) — AlexNet, the Transformer and scaling laws: what happened when learning met massive datasets, GPUs and new architectures.

---

## 7. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | [Newell & Simon (1956) — *The Logic Theory Machine*](https://bitsavers.org/pdf/rand/ipl/P-868_The_Logic_Theory_Machine_Jul56.pdf) | Early landmark example of automated symbolic reasoning. |
| R2 | [Newell, Shaw & Simon (1959–1961) — *GPS, A Program that Simulates Human Thought*](https://iiif.library.cmu.edu/file/Simon_box00064_fld04907_bdl0001_doc0001/Simon_box00064_fld04907_bdl0001_doc0001.pdf) | Emblematic program of heuristic search. |
| R3 | [McDermott (1980) — *R1: An Expert in the Computer Systems Domain*](https://cdn.aaai.org/AAAI/1980/AAAI80-076.pdf) | Foundational account of XCON/R1 for VAX system configuration. |
| R4 | [Buchanan & Shortliffe (1984) — evaluation of MYCIN](https://www.shortliffe.net/Buchanan-Shortliffe-1984/Chapter-30.pdf) | Performance, expert disagreement and evaluation limits in expert systems. |
| R5 | [JRC AI Watch (2020) — *Historical Evolution of Artificial Intelligence*](https://publications.jrc.ec.europa.eu/repository/bitstream/JRC120469/jrc120469_historical_evolution_of_ai-v1.1.pdf) | Historical framework for AI winters, symbolic AI and the transition to ML. |
| R6 | [Vapnik — *The Nature of Statistical Learning Theory*](https://link.springer.com/book/10.1007/978-1-4757-3264-1) | Foundations of generalization and statistical learning. |
| R7 | [Valiant (1984) — *A Theory of the Learnable*](https://people.mpi-inf.mpg.de/~mehlhorn/SeminarEvolvability/ValiantLearnable.pdf) | Formalization of learning without explicit programming. |
| R8 | [Robbins & Monro (1951) — *A Stochastic Approximation Method*](https://www.columbia.edu/~ww2040/8100F16/RM51.pdf) | Classical precursor to stochastic learning updates. |
| R9 | [Rosenblatt (1958) — *The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain*](https://www.ovid.com/00006832-195811000-00007) | Classical perceptron formulation. |
| R10 | [Minsky & Papert (1969) — *Perceptrons*](https://mitpress.mit.edu/9780262630221/perceptrons/) | Classical analysis of single-layer perceptron limitations. |
| R11 | [Rumelhart, Hinton & Williams (1986) — *Learning representations by back-propagating errors*](https://gwern.net/doc/ai/nn/1986-rumelhart-2.pdf) | Canonical paper on backpropagation in multilayer networks. |
| R12 | [Schmidhuber — history of backpropagation](https://people.idsia.ch/~juergen/who-invented-backpropagation.html) | Historical summary of precursors before 1986. |
| R13 | [Jurafsky & Martin — chapter on n-grams](https://web.stanford.edu/~jurafsky/slp3/3.pdf) | Classical framework for language models before transformers. |
| R14 | [Rabiner (1989) — *A Tutorial on Hidden Markov Models*](https://www.cs.ubc.ca/~murphyk/Bayes/rabiner.pdf) | Classical HMM reference for sequences and speech. |
| R15 | [Lafferty, McCallum & Pereira (2001) — *Conditional Random Fields*](https://daiwk.github.io/assets/Conditional%20random%20fields%20Probabilistic%20models%20for%20segmenting%20and%20labeling%20sequence%20data.pdf) | Introduction of CRFs for labeled sequences. |
| R16 | [Deng et al. (2009) — *ImageNet: A Large-Scale Hierarchical Image Database*](https://image-net.org/static_files/papers/imagenet_cvpr09.pdf) | Dataset and benchmark central to computer vision. |
| R17 | [Hinton & Salakhutdinov (2006) — *Reducing the Dimensionality of Data with Neural Networks*](https://www.cs.toronto.edu/~hinton/absps/science.pdf) | Reopening deep training before the boom. |
| R18 | [Bengio et al. (2007) — *Greedy Layer-Wise Training of Deep Networks*](https://proceedings.neurips.cc/paper/3048-greedy-layer-wise-training-of-deep-networks.pdf) | Role of layer-wise pretraining in deep networks. |
| R19 | [Krizhevsky, Sutskever & Hinton (2012) — *ImageNet Classification with Deep Convolutional Neural Networks*](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) | AlexNet and the 2012 threshold. |
| R20 | [LeCun, Bengio & Hinton (2015) — *Deep Learning*](https://www.nature.com/articles/nature14539) | Historical and technical review of deep learning's rise. |

</details>

---

## Frequently asked questions

**Why did expert systems work well and then hit a ceiling?**  
They worked well while the domain was stable and bounded, such as bacterial-infection diagnosis in MYCIN or VAX system configuration in XCON. The problem was not initial performance but maintenance: as a domain grew more complex, the rule base required constant revision, generated conflicts and accumulated exceptions without a systematic mechanism for resolving them. The bottleneck was not primarily computational but human: extracting and formalizing expert knowledge was expensive, slow and fragile.

**What conceptual change did statistical learning introduce compared with symbolic AI?**  
The shift was not merely toward more data; it changed the central question. Symbolic AI asked which rules had to be written to solve a task. Statistical learning asked which regularities a model could infer from enough examples. Learning became an optimization problem—adjusting parameters to reduce error—rather than formalizing expert knowledge in a rule base.

**Why did backpropagation unlock neural networks?**  
It provided a general operational recipe where there had previously been mostly intuition. Rumelhart, Hinton and Williams' 1986 paper showed how to propagate error backward from the output to estimate how each weight in each layer should change. Ideas for training multilayer networks had existed before, but without a systematic, reproducible procedure, deep networks could not be trained reliably and the field remained limited to shallow models.

**Why did the AI winters happen if the basic ideas were sound?**  
Because the gap between what the field promised and what it could deliver with the available resources was too large. The first winter followed inflated expectations and complexity barriers highlighted by reports such as Lighthill's in 1973. The second, in the late 1980s, arrived when expert systems exposed their scaling limits and the specialized AI-hardware market collapsed. The ideas were not necessarily wrong; the data, compute and training algorithms were not yet sufficient for what those ideas required.
