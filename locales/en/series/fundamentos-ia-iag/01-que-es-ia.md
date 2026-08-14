---
title: What is Artificial Intelligence
description: "What Artificial Intelligence is, how it works and how it evolved: from heuristics and Machine Learning to neural networks and foundation models."
date: 2026-03-15
keywords: "artificial intelligence, what is artificial intelligence, machine learning, deep learning, generative AI, neural networks, foundation models"
tags:
  - AI
  - LLMs
  - GenAI
---

# Chapter 1 — What is AI?

This chapter provides a framework for understanding almost any modern artificial-intelligence system, from a spam filter to a large language model. By the end, you will be able to distinguish the four broad technological families—AI, machine learning, deep learning and generative AI—identify where a system's learning signal comes from, and understand what changes internally when different algorithms are trained. No technical background is required. The chapter closes with MLOps: the engineering discipline that turns a trained model into a reliable production system.

Artificial intelligence is **not a mind or an autonomous entity**. It is a family of **systems built to optimize a task** from data, with a measurable objective and some mechanism for improving from experience.

Some systems classify, some predict, some decide, and more recent systems can **generate content**.

A useful way to understand any AI system is to answer three questions:

- **What kind of AI application is it?** — which technological family does it use?
- **How does it learn?** — where does the teaching signal come from?
- **What gets adjusted?** — which internal parameters change during training?

---

## 1. The general framework: AI, ML, DL and GenAI

A practical hierarchy is:

- **Artificial Intelligence (AI):** the broadest category. Machines or software that reproduce capabilities associated with human intelligence, such as reasoning, problem solving or decision making.
- **Machine Learning (ML):** a branch of AI in which systems **learn patterns from data** instead of relying only on explicit human-written rules.
- **Deep Learning (DL):** a type of ML based on **multi-layer neural networks**, especially useful for complex data such as images, audio and language.
- **Generative AI (GenAI):** systems whose primary output is **new content** such as text, images, audio, video or code. In this series we use the label operationally; technically, generative modelling is broader than deep neural networks alone.

> AI / ML / DL describe the **technological family**. “Generative” describes a system whose main output is newly generated content.

{{ include_html("snippets/fundamentos-ia/ia_ml_dl.html") }}

Once we know the technological family, the next question is: **where does the signal that makes the system learn come from?**

---

## 2. How do these systems learn?

Supervised, unsupervised, self-supervised and reinforcement learning are not model architectures. They describe **how the learning signal is constructed**—in other words, what kind of “teacher” the system has.

> Supervised / unsupervised / self-supervised / reinforcement learning describe **where the teacher comes from**.

{{ include_html("snippets/fundamentos-ia/tipos_aprendizaje.html") }}

The third question completes the framework: **what changes inside the model when it learns?**

---

## 3. How these systems are adjusted

Knowing where the learning signal comes from is not enough. We also need to understand **what is being changed** so that the model improves.

### 3.1 The universal learning loop

1. **Train and predict** using the current parameters.
2. **Measure error** or another objective.
3. **Adjust something internal** to improve that objective.
4. **Repeat** many times.

> **Learning = changing internal parameters so the system makes fewer errors on data similar to the training distribution.**

### 3.2 Why a model can learn today and work tomorrow

A model trains on a **sample of the world** and is expected to capture patterns that continue to hold later.

- If future data is sufficiently similar, the model generalizes well.
- If the world changes substantially—**data drift**—performance can degrade, so the system must be monitored and often retrained.

This is why AI systems are not truly static products. Their performance depends on the relationship between training data and the world they encounter after deployment.

### 3.3 What gets adjusted in different algorithm families

Think of every algorithm as a machine with a particular kind of **parameter**. Training updates those parameters so predictions improve.

#### 1. Rules and decisions: decision trees, Random Forest, XGBoost

Internally the system changes:

- which feature to inspect,
- the threshold used for each split,
- and the structure/depth of the tree.

> It is like constructing a questionnaire: “if A is true, ask B; otherwise ask C.”

For a loan-approval model, training may discover that monthly income is a useful first split and debt ratio a useful second split. The algorithm searches for questions and thresholds that separate the target classes well.

{{ include_html("snippets/fundamentos-ia/algoritmos/arboles_decision.html") }}

#### 2. Probabilities learned from counts: Naive Bayes

The model adjusts tables of frequencies and probabilities: which signals appear more often in each class. It assumes features are approximately conditionally independent given the class, which makes evidence easy to combine.

> Think of it as counting: “when the message is spam, how often do I see ‘free’? How often do I see ‘urgent’?”

If “free” appears frequently in spam and rarely in legitimate mail, it pushes the prediction toward spam.

{{ include_html("snippets/fundamentos-ia/algoritmos/naive_bayes.html") }}

#### 3. Group prototypes: clustering and k-means

The parameters are the **positions of cluster centers**. Data points are assigned to the closest center and the centers are then moved toward the mean of their assigned points.

> Think of magnets on a map: every point goes to the nearest magnet, then each magnet moves toward the center of its group.

A business example is segmenting customers by purchase frequency, spend and channel usage without having predefined labels.

{{ include_html("snippets/fundamentos-ia/algoritmos/kmeans.html") }}

#### 4. Numerical weights: neural networks

A neural network adjusts **weights and biases**. A weight represents how strongly one signal influences another; in deep networks there may be millions or billions of such values distributed across many layers.

Each neuron computes a weighted sum and applies an activation function so the network can represent non-linear relationships.

<details markdown="1">
<summary><strong>Technical detail: the minimum training pieces</strong></summary>

- **Activation function:** introduces non-linearity so stacked layers can express relationships more complex than one linear transformation.
- **Loss function:** converts the model's error into an objective to minimize.
- **Backpropagation:** uses the chain rule to assign responsibility for the error to parameters throughout the network.
- **Optimizer:** decides how far and in which direction to move each parameter at every training step.

Internal activations provide representational capacity; output activations can convert scores into interpretable quantities such as probabilities through sigmoid or softmax.

</details>

In a spam classifier, inputs such as “free,” “urgent” and “many links” are combined through weighted connections. If the prediction is wrong, the weights and biases are adjusted so the next similar example is handled better.

{{ include_html("snippets/fundamentos-ia/redes_neuronales.html") }}

### 3.4 Which data suits which family?

| Family | Data it handles well | Where it is often not the first choice |
|---|---|---|
| **Trees** (Decision Tree, Random Forest, XGBoost) | Structured tabular data: numbers, categories and mixed business variables | Raw images, audio or language without feature extraction |
| **Naive Bayes** | Text represented as token/word counts; categorical data with limited feature dependence | Strongly correlated continuous variables and complex interactions |
| **K-means** | Continuous numerical data where a distance metric is meaningful | Pure categorical data, raw text, or very high-dimensional data without a useful representation |
| **Neural networks** | Images, audio, text, time series and video, especially with large datasets and complex patterns | Small tabular datasets where tree ensembles are often cheaper and stronger |

These four families illustrate the spectrum; they are not the entire map. SVMs, linear/logistic regression, mixture models, Bayesian networks, time-series models and many other approaches remain useful. Algorithm choice starts with the data and the objective.

---

## 4. Classical software vs AI

The distinction above changes **where the logic comes from**.

In classical software:

> **input data + human-written rules → output**

For Fahrenheit-to-Celsius conversion, the programmer explicitly writes `C = (F − 32) × 5/9`. The same input produces the same output because the rule is fixed.

In machine learning:

> **input examples + target outputs → learned rule**

Given many Fahrenheit/Celsius pairs, a model can adjust parameters until it approximates the conversion without being given the exact formula.

This is the basic intuition behind **Software 2.0**: part of the logic is learned rather than explicitly written.

That shift happened gradually over decades.

---

## 5. Major milestones

You do not need to memorize the entire timeline. The useful question is **what changed in each wave**.

| Date | Milestone | What changed |
|---|---|---|
| **1950** | **Turing** ([paper][hito-turing]) | Established a conceptual framework for machine intelligence. |
| **1955–1956** | **Dartmouth** ([proposal][hito-dartmouth]) | Artificial Intelligence became a formal research field. |
| **1958–1959** | **Perceptron and early ML** ([Rosenblatt][hito-perceptron], [Samuel][hito-samuel]) | Learning from data became a concrete alternative to explicit rules. |
| **1980s** | **Expert systems** ([XCON][hito-xcon]) | First major commercial wave of rule-based AI. |
| **1986** | **Backpropagation** ([paper][hito-backprop]) | Training multilayer neural networks became practical. |
| **1997** | **Deep Blue** ([IBM][hito-deepblue]) | Specialized AI defeated the world chess champion. |
| **2012** | **AlexNet + ImageNet** ([paper][hito-alexnet], [ILSVRC][hito-imagenet]) | Modern data-and-GPU-scaled deep learning accelerated. |
| **2017** | **Transformer** ([paper][hito-transformer]) | Introduced the architecture underlying modern language models. |
| **2020–2022** | **GPT-3, AlphaFold, ChatGPT** ([GPT-3][hito-gpt3], [AlphaFold][hito-alphafold-paper], [ChatGPT][hito-chatgpt]) | Foundation models, major scientific impact and mass-market generative AI arrived. |

A compact mental model is:

> **rules → statistical learning → deep learning → foundation models → broadly useful AI systems**

A capable model, however, is still not a production product.

---

## 6. MLOps: making AI work in the real world

MLOps is the engineering discipline that keeps an ML system reliable after training, including months later when users, data and operating conditions have changed. ([Google Cloud](https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning))

> A trained model ≠ a production AI system.

A useful production loop has eight stages:

1. **Capture data** from real-world events, transactions, documents or logs.
2. **Prepare data** so inputs are clean and represented consistently.
3. **Train** the model on historical examples.
4. **Evaluate** before production using appropriate held-out data and metrics.
5. **Version** the model, data and configuration for traceability.
6. **Deploy** gradually through an API, batch job or other serving system.
7. **Monitor** data drift, errors, latency and model performance.
8. **Collect feedback and improve** by retraining, correcting or rolling back when real outcomes become available.

{{ include_html("snippets/fundamentos-ia/mlops/ciclo_mlops.html") }}

!!! tip "Next chapter"
    [Chapter 2 — What is Generative AI? →](./02-que-es-ia-generativa.md)

---

## 7. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
|---|---|---|
| R1 | **OECD** — *Explanatory Memorandum on the Updated OECD Definition of an AI System* ([OECD][1]) | Clarifies the modern definition of an AI system. |
| R2 | **ISO/IEC 22989:2022** — *Artificial intelligence — Concepts and terminology* ([ISO][5]) | Core AI vocabulary and concepts. |
| R3 | **Tom M. Mitchell** — *Machine Learning* ([CMU][2]) | Classical formal framing of machine learning. |
| R4 | **LeCun, Bengio & Hinton (2015)** — *Deep Learning* ([Nature][3]) | Concise review of the deep-learning revolution. |
| R5 | **Goodfellow, Bengio & Courville** — *Deep Learning* ([book][6]) | Technical foundation for modern neural networks. |
| R6 | **Sutton & Barto** — *Reinforcement Learning: An Introduction* ([book][7]) | Classical reinforcement-learning reference. |
| R7 | **Wirth & Hipp** — *CRISP-DM* ([paper][8]) | Standard process model for data-mining projects. |
| R8 | **Sculley et al. (2015)** — *Hidden Technical Debt in Machine Learning Systems* ([paper][4]) | Why a model alone is not a production system. |

</details>

[1]: https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/03/explanatory-memorandum-on-the-updated-oecd-definition-of-an-ai-system_3c815e51/623da898-en.pdf
[2]: https://www.cs.cmu.edu/~tom/files/MachineLearningTomMitchell.pdf
[3]: https://www.nature.com/articles/nature14539
[4]: https://papers.neurips.cc/paper/5656-hidden-technical-debt-in-machine-learning-systems.pdf
[5]: https://www.iso.org/standard/74296.html
[6]: https://www.deeplearningbook.org/
[7]: https://incompleteideas.net/book/the-book-2nd.html
[8]: https://cs.unibo.it/~danilo.montesi/CBD/Beatriz/10.1.1.198.5133.pdf

<details markdown="1">
<summary><strong>Milestone sources</strong></summary>

| Milestone | Source |
|---|---|
| Turing | [*Computing Machinery and Intelligence*][hito-turing] |
| Dartmouth | [1955 research proposal][hito-dartmouth] |
| Perceptron | [Rosenblatt][hito-perceptron] |
| Machine learning in checkers | [Samuel][hito-samuel] |
| Expert systems | [XCON][hito-xcon] |
| Backpropagation | [Rumelhart, Hinton & Williams][hito-backprop] |
| Deep Blue | [IBM][hito-deepblue] |
| AlexNet | [paper][hito-alexnet] |
| ImageNet | [ILSVRC][hito-imagenet] |
| AlphaGo | [Nature paper][hito-alphago] |
| Transformer | [*Attention Is All You Need*][hito-transformer] |
| BERT | [paper][hito-bert] |
| GPT-3 | [OpenAI][hito-gpt3] |
| AlphaFold | [Nature paper][hito-alphafold-paper] |
| ChatGPT | [OpenAI announcement][hito-chatgpt] |

</details>

[hito-turing]: https://academic.oup.com/mind/article-abstract/LIX/236/433/986238
[hito-dartmouth]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/1904
[hito-perceptron]: https://deeplearning.cs.cmu.edu/S24/document/readings/Rosenblatt_1959-09865-001.pdf
[hito-samuel]: https://people.csail.mit.edu/brooks/idocs/Samuel.pdf
[hito-xcon]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/download/460/396
[hito-backprop]: https://www.nature.com/articles/323533a0.pdf
[hito-deepblue]: https://www.ibm.com/history/deep-blue
[hito-alexnet]: https://proceedings.neurips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf
[hito-imagenet]: https://image-net.org/challenges/LSVRC/
[hito-alphago]: https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf
[hito-transformer]: https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html
[hito-bert]: https://aclanthology.org/N19-1423/
[hito-gpt3]: https://openai.com/index/language-models-are-few-shot-learners/
[hito-alphafold-paper]: https://www.nature.com/articles/s41586-021-03819-2.pdf
[hito-chatgpt]: https://openai.com/index/chatgpt/

---

## Frequently asked questions

**What is the difference between Deep Learning and Machine Learning?**  
Deep Learning is a specialized form of Machine Learning that uses multi-layer neural networks, especially for complex unstructured data such as images, audio and language. ML is the broader category: many effective ML systems are trees, regressions, clustering methods or probabilistic models rather than deep neural networks.

**What does it mean for a model to “learn”?**  
It means that training changes internal parameters so an objective improves on examples and, ideally, on sufficiently similar unseen data. Different algorithms change different things: tree splits, probability tables, cluster centers or neural-network weights.

**Why does an AI model need monitoring after deployment?**  
Because the real world can drift away from the training distribution. Input patterns, customer behaviour, fraud strategies or market conditions change. A model can remain technically healthy while its predictive quality degrades, which is why production systems monitor both infrastructure and model/data behaviour.

**What is the difference between a trained model and an AI product?**  
A model is one component. A production system also needs data pipelines, evaluation, versioning, serving, monitoring, feedback loops, rollback mechanisms and operational ownership. That surrounding lifecycle is the purpose of MLOps.
