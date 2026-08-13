---
title: What is Artificial Intelligence?
description: "What Artificial Intelligence is, how it works and how it evolved: from heuristics and Machine Learning to neural networks and foundation models."
date: 2026-03-15
keywords: "artificial intelligence, what is artificial intelligence, machine learning, deep learning, generative AI, neural networks, foundation models"
tags:
  - AI
  - LLMs
  - GenAI
---

# Chapter 1 — What is AI?

This chapter provides a framework for understanding any modern artificial-intelligence system, from a spam filter to a large language model. By the end, you will be able to distinguish the four main technology families—AI, ML, DL and GenAI—understand where the learning signal comes from, and know what changes internally in each type of algorithm during training. No technical background is required, although becoming familiar with the vocabulary will make later chapters easier to follow. The chapter closes with MLOps: the engineering discipline that turns a trained model into a reliable real-world product.

Artificial intelligence is **not a "mind" or an autonomous entity**. It is a family of **systems built to optimize a task** from data, with a measurable objective and some mechanism that lets performance improve through learning.

Sometimes those systems classify. Sometimes they predict or decide. More recently, many of them **generate content**.

To avoid mixing products, models and marketing labels, we will use a simple framework that works for **any modern AI system**.

You can understand an AI system by answering three questions:

- **What kind of AI application is it?** Which technology family does it use?
- **How does it learn?** Where does the teaching signal come from?
- **How is it adjusted?** What changes inside the model during training?

We will answer them in that order.

---

## 1. The general framework: AI, ML, DL and GenAI

A useful way to visualize the hierarchy is:

- **Artificial Intelligence (AI):** the broadest concept. It refers to **machines or software that reproduce capabilities associated with human intelligence** such as reasoning, problem solving or decision making. In a human-body analogy, AI is the **"brain"**.
- **Machine Learning (ML):** a branch of AI that lets systems **learn from data and improve with experience** instead of relying only on explicitly written rules. In the analogy, ML is the **"training"** of that brain.
- **Deep Learning (DL):** a specialized form of ML that uses **neural networks with many layers** to process complex data such as images, audio or language. It corresponds to the deep network of neurons and connections in the analogy.
- **Generative Artificial Intelligence (GenAI):** the part of modern AI focused on **generating content** such as text, images, audio and code.

> AI / ML / DL describe the **technology family** of the system.
> In this series, "generative" is used as a practical label for systems whose primary output is **new content**, while technically also referring to model families that learn distributions and sample from them.

{{ include_html("snippets/fundamentos-ia/ia_ml_dl.html") }}

We now know how to identify the technology family. The second question is: **where does the signal that makes the system learn come from?**

## 2. How do these systems learn?

These are not different model families. They are **different ways of constructing the learning signal**—in other words, different kinds of teacher.

> Supervised / unsupervised / self-supervised / reinforcement learning describe **where the teacher comes from**.

{{ include_html("snippets/fundamentos-ia/tipos_aprendizaje.html") }}

Once we know where the teacher comes from, the third question completes the framework: **what exactly changes inside the model when it learns?** The answer depends on the algorithm family, and understanding that difference is what separates merely using AI from understanding AI.

## 3. How these systems are adjusted

Knowing **where the learning signal comes from**—supervised, self-supervised or reinforcement learning—is not enough.

The key is understanding **what is adjusted, and how**, so that the model improves.

### 3.1 The universal learning loop

1. **Train and predict** using the current data and parameters.
2. **Measure the error** or how well the system separates, groups or scores the data.
3. **Adjust something internal** to reduce that error.
4. **Repeat** many times.

> **Learning = changing internal parameters so that the system makes fewer mistakes on data similar to its training distribution.**

### 3.2 Why a model can learn today and serve tomorrow

Models are trained on a **sample of the world**—the data available today—and are expected to capture **general patterns** that remain useful later.

- If future data is **similar**, the model generalizes well.
- If the world changes substantially—**data drift**—performance falls, so the system should be **monitored** and often **retrained**.

That is why it matters to know what is being adjusted: different algorithm families learn in different ways. It is also why AI systems are not static products. They need ongoing monitoring and maintenance.

---

### 3.3 What changes in each algorithm family

Think of every algorithm as a machine with a particular type of **parameter**. Training means updating those parameters so its predictions increasingly fit the target behavior.

#### 1. They adjust **rules and decisions**: Decision Trees, Random Forest, XGBoost

**What changes internally:**

- The **questions** the model asks—what feature to inspect.
- The **thresholds** used in those questions—for example, "greater than X?"
- The **tree structure**—which branches exist and how deep they go.

> Think of it as building a **questionnaire**: "if A happens, ask B; otherwise ask C."

**Loan-approval example:**

- A candidate first rule could be "monthly income above X?" to separate applications with more repayment capacity.
- Then "debt ratio below Y?" further refines the split.
- Training means testing many questions and thresholds and keeping the ones that **best separate** approvable from non-approvable applications.

{{ include_html("snippets/fundamentos-ia/algoritmos/arboles_decision.html") }}

---

#### 2. They adjust **probabilities learned from counts**: Naive Bayes

**What changes internally:**

- Tables of **frequencies and probabilities** describing which signals appear more often in each class.
- It treats the signals as **approximately independent** given the class so it can combine evidence simply.

> Think of it as keeping a **count**: "when a message is spam, how often do I see 'free'? How often do I see 'urgent'?"

**Spam example:**

- If "free" appears very often in spam and rarely in non-spam messages, that pushes the prediction toward spam.
- Training means updating those counts across many examples and turning them into probabilities.

{{ include_html("snippets/fundamentos-ia/algoritmos/naive_bayes.html") }}

---

#### 3. They adjust **groups by feature similarity**: Clustering, k-means

**What changes internally:**

- The **position** of the group centers. Each center acts as a prototype.

What "similar" means depends on the **distance function** and on how the variables are **scaled**.

> Think of placing **magnets** on a map: each data point goes to the nearest magnet, then each magnet moves toward the center of its assigned points.

**Example:**

- Group customers by behavior—purchase frequency, spend and channels—without predefined labels.
- Training means repositioning the centers so points are **as close as possible** to their cluster and similar customers end up together.

{{ include_html("snippets/fundamentos-ia/algoritmos/kmeans.html") }}

---

#### 4. They adjust **numerical weights**: Neural networks

**What changes internally:**

- **Weights** and **biases** in the connections. These numbers determine **how much influence** each input signal has when signals are combined.
- Deep networks can contain **millions or billions** of such parameters distributed across layers.

> Each neuron computes a **weighted sum** and then applies an **activation function**, which lets the system represent nonlinear relationships.

<details markdown="1">
<summary><strong>Technical deep dive (optional)</strong></summary>

**Two common roles of activation functions:**

- In **hidden layers**, they introduce nonlinearity and therefore representational capacity.
- At the **output**, they can turn scores into interpretable quantities—for example probabilities through sigmoid or softmax.

**Why activation functions matter:**

- Without them, several stacked layers would collapse into a single linear transformation, leaving the model too rigid.
- Activation functions introduce **nonlinearity**, allowing the network to represent relationships such as "A and B but not C," curved decision boundaries and soft thresholds.
- They also affect optimization: some activations make deep networks easier or harder to train.

**The four minimum pieces required for the adjustment loop:**

- **Activation function:** gives the system capacity to model **nonlinear** relationships.
- **Loss function:** measures how wrong the current output is.
- **Backpropagation:** assigns responsibility for the error to the weights that contributed to it.
- **Optimizer:** decides how far to move each weight at every step through many small repeated updates.

</details>

**Spam example:**

- Signals: "free," "urgent," "many links," and so on.
- The network combines them with weights, passes the result through activations and produces a score or probability.
- When it is wrong, training adjusts weights and biases so each signal has more or less influence next time.

{{ include_html("snippets/fundamentos-ia/redes_neuronales.html") }}

---

### 3.4 Which data fits each family?

Not every family is equally suitable for every problem. The data type is often the first useful filter:

| Family | Data it handles well | Where it is usually not the first choice |
| --- | --- | --- |
| **Trees** (Decision Tree, Random Forest, XGBoost) | Structured tabular data: numbers, categories and mixed business variables. Often extremely strong on business tables and Kaggle-style tabular problems. | Images, audio and raw text without preprocessing. |
| **Naive Bayes** | Text represented through token/word frequencies and categorical data with relatively weak feature dependencies. Very fast and effective with limited data. | Strongly correlated continuous variables and complex feature interactions. |
| **K-means** (clustering) | Continuous numerical data where Euclidean distance is meaningful: coordinates or scaled behavior metrics. | Raw text, very high-dimensional data without prior reduction, and purely categorical variables. |
| **Neural networks** | Images, audio, text, time series and video. They shine when data volume is large and the underlying pattern is complex. | Small tabular datasets, where tree-based methods often win with much lower computational cost. |

> **These four families illustrate the range of adjustment mechanisms; they are not the entire map.** Other families include SVMs, linear/logistic regression, Gaussian mixtures, Bayesian networks, time-series models such as ARIMA, ensemble methods and many more. Algorithm choice always starts with the data type and the objective.

These three axes—**technology family, learning type and adjustment mechanism**—are enough to describe the structure of almost any modern AI system. They also reveal a deeper common question: where does the logic that makes the system work come from?

## 4. Classical software vs AI

Everything above describes a different way of defining the logic of a solution. The difference is not the programming language used to implement the system, but **where the working logic comes from**.

In classical software:

- **Input data + rules written by humans → output**

For example, convert Fahrenheit to Celsius with a fixed formula:

- The programmer explicitly writes **C = (F - 32) × 5/9**.
- The same Fahrenheit input always produces the same Celsius result.

In AI:

- **Input data + target outputs → learned rules**
- The effective algorithm—the mathematical rule—emerges through training.

For example, provide many **(Fahrenheit, Celsius)** pairs and let a system learn the conversion:

- You no longer write the exact formula by hand.
- The model adjusts parameters and learns an approximate mapping that can generalize to new values.

This is the core idea behind **Software 2.0**: instead of explicitly writing all the logic, part of the logic is learned from data.

That does not yet change how all software is built; it changes how we construct solutions that use AI. The larger shift in software development arrives with LLMs.

The transition did not happen overnight. Decades of advances, failures and discontinuities explain how we reached the current systems.

## 5. Major milestones

You do not need to memorize the chronology. The useful question is **what changed in each wave**.

| Date | Major milestone | What changed |
| --- | --- | --- |
| **1950** | **Turing** ([paper][hito-turing]) | Established the conceptual framework for "intelligence in machines." |
| **1955–1956** | **Dartmouth Conference** ([proposal][hito-dartmouth]) | AI emerged formally as a research field. |
| **1958–1959** | **Perceptron and early machine-learning demonstrations** ([Rosenblatt paper][hito-perceptron], [Samuel paper][hito-samuel]) | The idea of learning from data, rather than relying only on rules, became concrete. |
| **1980s** | **Expert systems** ([XCON case][hito-xcon]) | First major enterprise wave of rule-based AI. |
| **1986** | **Backpropagation** ([paper][hito-backprop]) | Made training multilayer neural networks practical. |
| **1997** | **Deep Blue** ([IBM][hito-deepblue]) | A specialized AI defeated the world chess champion and made narrow AI's power visible. |
| **2012** | **AlexNet + ImageNet** ([paper][hito-alexnet], [ILSVRC][hito-imagenet]) | Started the modern deep-learning era built on scale, data and GPUs. |
| **2017** | **Transformer — "Attention Is All You Need"** ([paper][hito-transformer]) | Introduced the architecture that underpins modern language models. |
| **2020–2022** | **GPT-3, AlphaFold and ChatGPT** ([GPT-3][hito-gpt3], [CASP14][hito-casp14], [AlphaFold Nature paper][hito-alphafold-paper], [ChatGPT announcement][hito-chatgpt]) | Foundation models, direct scientific impact and mass adoption arrived. |

A simpler mental model is:

> **rules → statistical learning → deep learning → foundation models → AI at useful scale**

All of that research produced increasingly capable and efficient models. But a capable model is not yet a product. Reliable real-world AI requires an engineering lifecycle around the model.

## 6. MLOps: the complete lifecycle for real-world AI

MLOps is the engineering discipline that makes an AI system operate reliably in the real world—not only today, but months later when the data, market or user behavior have changed. ([Google Cloud](https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning))

The key idea is:

> A trained model ≠ production AI.
> Production requires a complete cycle: data → training → deployment → monitoring → improvement.

A clear way to understand MLOps is as an eight-step chain. Miss a critical step and you often have a demo rather than a durable product.

1. **Data — capture:** collect real-world signals such as events, transactions, documents and logs.
2. **Data — prepare:** clean data and transform it into features or representations the model can consume.
3. **Train:** learn patterns from historical examples.
4. **Evaluate:** verify that performance is good enough before touching production.
5. **Version:** record which model exists and which data/code/configuration produced it.
6. **Deploy:** serve it through an API or batch process, ideally with gradual rollout mechanisms.
7. **Monitor:** detect data changes, latency/errors and performance degradation.
8. **Feedback and improve:** when ground truth arrives, correct the system, retrain it or roll back.

{{ include_html("snippets/fundamentos-ia/mlops/ciclo_mlops.html")}}

!!! tip "Next reading"
    The next chapter goes deeper into the most disruptive AI family of the last decade: [Chapter 2 — What is Generative AI? →](./02-que-es-ia-generativa.md)

## 7. References

<details markdown="1">
<summary><strong>Primary sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **OECD** — *Explanatory Memorandum on the Updated OECD Definition of an AI System* ([OECD][1]) | Clarifies the modern definition of an AI system. |
| R2 | **ISO/IEC 22989:2022** — *Artificial intelligence — Concepts and terminology* ([ISO][5]) | Foundational vocabulary and concepts. |
| R3 | **Tom M. Mitchell** — *Machine Learning* ([CMU School of Computer Science][2]) | Formalizes learning in terms of experience, task and performance. |
| R4 | **Y. LeCun, Y. Bengio, G. Hinton (2015)** — *Deep Learning* ([Nature][3]) | Compact overview of the deep-learning revolution. |
| R5 | **I. Goodfellow, Y. Bengio, A. Courville** — *Deep Learning* ([Deep Learning Book][6]) | Technical foundation for modern neural networks. |
| R6 | **R. S. Sutton, A. G. Barto** — *Reinforcement Learning: An Introduction* ([Incomplete Ideas][7]) | Classic reinforcement-learning reference. |
| R7 | **R. Wirth, J. Hipp** — *CRISP-DM: Towards a Standard Process Model for Data Mining* ([cs.unibo.it][8]) | Standardized process model for data/ML work. |
| R8 | **D. Sculley et al. (2015)** — *Hidden Technical Debt in Machine Learning Systems* ([NeurIPS Papers][4]) | Explains why a trained model is only a small part of a real production system. |

</details>

[1]: https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/03/explanatory-memorandum-on-the-updated-oecd-definition-of-an-ai-system_3c815e51/623da898-en.pdf "Explanatory memorandum on the updated OECD definition ..."
[2]: https://www.cs.cmu.edu/~tom/files/MachineLearningTomMitchell.pdf "Mitchell. Machine Learning."
[3]: https://www.nature.com/articles/nature14539 "Deep learning"
[4]: https://papers.neurips.cc/paper/5656-hidden-technical-debt-in-machine-learning-systems.pdf "Hidden Technical Debt in Machine Learning Systems"
[5]: https://www.iso.org/standard/74296.html "ISO/IEC 22989:2022 - Artificial intelligence"
[6]: https://www.deeplearningbook.org/ "Deep Learning Book"
[7]: https://incompleteideas.net/book/the-book-2nd.html "Reinforcement Learning: An Introduction"
[8]: https://cs.unibo.it/~danilo.montesi/CBD/Beatriz/10.1.1.198.5133.pdf "CRISP-DM: Towards a Standard Process Model for Data ..."

**Milestone references**

<details markdown="1">
<summary><strong>Milestone sources</strong></summary>

| Milestone | Source | Short description |
| --- | --- | --- |
| H1 | Alan Turing — *Computing Machinery and Intelligence* ([paper][hito-turing]) | Conceptual framework for machine intelligence. |
| H2 | Dartmouth Summer Research Project on Artificial Intelligence (1955) ([proposal][hito-dartmouth]) | Foundational proposal for the AI field. |
| H3 | Frank Rosenblatt — *The Perceptron* ([paper][hito-perceptron]) | Early major step toward learning from data. |
| H4 | Arthur Samuel — *Some Studies in Machine Learning Using the Game of Checkers* ([paper][hito-samuel]) | Early practical demonstration that a machine could improve from experience. |
| H5 | XCON / expert systems at Digital Equipment Corporation ([XCON case][hito-xcon]) | Industrial rise of rule-based AI. |
| H6 | Rumelhart, Hinton, Williams — *Learning representations by back-propagating errors* ([paper][hito-backprop]) | Made multilayer-network training viable. |
| H7 | IBM — Deep Blue vs Kasparov (1997) ([IBM][hito-deepblue]) | Public demonstration of specialized AI at world-champion level. |
| H8 | AlexNet — *ImageNet Classification with Deep Convolutional Neural Networks* (2012) ([paper][hito-alexnet]) | Triggered the modern visual deep-learning era. |
| H9 | ImageNet / ILSVRC ([ILSVRC][hito-imagenet]) | Benchmark that accelerated computer-vision progress. |
| H10 | AlphaGo (2016) — *Mastering the game of Go with deep neural networks and tree search* ([Nature paper][hito-alphago]) | Combined deep learning and search to exceed top human Go players. |
| H11 | AlphaGo vs Lee Sedol (2016) ([DeepMind][hito-alphago-match]) | The public match that made the technical jump visible globally. |
| H12 | *Attention Is All You Need* — Transformer (2017) ([paper][hito-transformer]) | Base architecture for today's language and multimodal models. |
| H13 | BERT (2019) — *Pre-training of Deep Bidirectional Transformers for Language Understanding* ([paper][hito-bert]) | Consolidated bidirectional pretraining in NLP. |
| H14 | GPT-3 (2020) — *Language Models are Few-Shot Learners* ([OpenAI article][hito-gpt3]) | Scaled foundation language models to a new regime. |
| H15 | CASP14 / AlphaFold (2020–2021) ([CASP14][hito-casp14], [Nature paper][hito-alphafold-paper], [DeepMind][hito-alphafold-blog]) | Major scientific impact from AI at scale. |
| H16 | ChatGPT (2022) ([OpenAI announcement][hito-chatgpt]) | Brought generative AI to mass public use. |
| H17 | University of Reading — Turing Test 2014 ([article][hito-turing2014]) | Popular reference in the ongoing Turing-test debate. |
| H18 | *AlphaGo — The Movie* (2017, dir. Greg Kohs) ([YouTube documentary][hito-alphago-doc]) | Documentary on the Lee Sedol match and its human/technical impact. |
| H19 | *AlphaFold: The making of a scientific breakthrough* — DeepMind (2021) ([YouTube documentary][hito-alphafold-doc]) | Documentary on AlphaFold's development and impact. |

</details>

[hito-turing]: https://academic.oup.com/mind/article-abstract/LIX/236/433/986238 "Computing Machinery and Intelligence"
[hito-dartmouth]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/1904 "A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence"
[hito-perceptron]: https://deeplearning.cs.cmu.edu/S24/document/readings/Rosenblatt_1959-09865-001.pdf "The Perceptron"
[hito-samuel]: https://people.csail.mit.edu/brooks/idocs/Samuel.pdf "Some Studies in Machine Learning Using the Game of Checkers"
[hito-xcon]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/download/460/396 "R1 and Beyond"
[hito-backprop]: https://www.nature.com/articles/323533a0.pdf "Learning representations by back-propagating errors"
[hito-deepblue]: https://www.ibm.com/history/deep-blue "Deep Blue"
[hito-alexnet]: https://proceedings.neurips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf "ImageNet Classification with Deep Convolutional Neural Networks"
[hito-imagenet]: https://image-net.org/challenges/LSVRC/ "ImageNet Large Scale Visual Recognition Challenge"
[hito-alphago]: https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf "Mastering the game of Go with deep neural networks and tree search"
[hito-alphago-match]: https://deepmind.google/research/alphago/ "AlphaGo"
[hito-transformer]: https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html "Attention Is All You Need"
[hito-bert]: https://aclanthology.org/N19-1423/ "BERT"
[hito-gpt3]: https://openai.com/index/language-models-are-few-shot-learners/ "Language Models are Few-Shot Learners"
[hito-casp14]: https://predictioncenter.org/casp14/doc/CASP14_press_release.html "CASP14 press release"
[hito-alphafold-paper]: https://www.nature.com/articles/s41586-021-03819-2.pdf "Highly accurate protein structure prediction with AlphaFold"
[hito-alphafold-blog]: https://deepmind.google/blog/alphafold-a-solution-to-a-50-year-old-grand-challenge-in-biology/ "AlphaFold"
[hito-chatgpt]: https://openai.com/index/chatgpt/ "Introducing ChatGPT"
[hito-turing2014]: https://archive.reading.ac.uk/news-events/2014/June/pr583836.html "Turing Test success marks milestone in computing history"
[hito-alphago-doc]: https://www.youtube.com/watch?v=WXuK6gekU1Y "AlphaGo — The Movie"
[hito-alphafold-doc]: https://www.youtube.com/watch?v=gg7WjuFs8F4 "AlphaFold: The making of a scientific breakthrough"

---

## Frequently asked questions

**What is the difference between Deep Learning and Machine Learning?**
Deep Learning is a specialized form of Machine Learning that uses many-layer neural networks to handle complex data such as images, audio and language. ML is the broader field of learning patterns from data; DL is one particularly powerful family inside it.

**How can a system learn without anyone telling it the correct answer?**
There are several mechanisms. In unsupervised learning, the system searches for structure without labels—for example grouping customers by behavior. In self-supervised learning, the data creates its own training target: a language model can predict missing or next tokens using the surrounding text as the signal, without human annotation for every example.

**Why is logic learned instead of written in AI?**
In traditional software, the programmer specifies the rules explicitly. In AI, examples and an optimization objective let the effective rule emerge from training. The engineer designs the learning process; the model discovers the concrete parameterization that solves the task.

**What physically changes inside a neural network when it learns?**
Millions or billions of numerical weights and biases are adjusted across the network. Backpropagation computes how each parameter contributed to the error, and the optimizer updates those parameters in small repeated steps so the accumulated loss decreases.
