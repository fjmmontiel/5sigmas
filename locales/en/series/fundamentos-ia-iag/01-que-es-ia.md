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

This chapter presents a framework for understanding any modern artificial-intelligence system, from a spam filter to a large language model. By the end, the reader will be able to distinguish the four main technological families (AI, ML, DL and GenAI), understand where the signal that makes a system learn comes from, and know what changes internally in each type of algorithm during training. No technical experience is required, although becoming familiar with the terms will make the following chapters easier to follow. The chapter closes with MLOps, the engineering that turns a trained model into a product that works reliably in the real world.

Artificial intelligence is **not a “mind” or an autonomous entity**.
It is a family of **systems built to optimize a task** from data, with a measurable objective, and with the ability to improve through some mechanism of “learning”.

Sometimes these systems classify, sometimes they predict, sometimes they decide and, in the most recent cases, they **generate content**.

To avoid confusing products, models and marketing, we are going to use a simple framework that lets us understand **any modern AI system**.

Any “AI system” can be understood by answering:

- **What type of AI application is it?**: the family/technology it uses
- **How does it learn?**: where the “teacher” comes from
- **How is it adjusted?**: how the model changes during training

We will answer each question in order.

---
## 1. The General Framework: AI, ML, DL and GenAI
An effective way to visualize the hierarchy is the following:

* **Artificial Intelligence (AI):** the broadest concept. It refers to **machines or software that imitate capabilities associated with human intelligence** in order to reason, solve problems or make decisions. In the human-body analogy, AI would be the **“brain”**.

* **Machine Learning (ML):** a branch of AI that lets systems **learn from data and improve with experience**, instead of depending on explicit rules. In the analogy, ML would be the **“training”** of that brain.

* **Deep Learning (DL):** a specialized type of ML that uses **neural networks with many layers** to handle complex data such as images, audio or language. It resembles the **neurons and deep connections** of the brain.

* **Generative Artificial Intelligence (GenAI):** a part of DL oriented toward **generating content** (text, image, audio, code).

> AI / ML / DL describe the system's **technological family**.
> In this series, “generative” is used as a practical label for systems whose primary output is **new content**, although technically it also refers to a family of generative models that model distributions and generate samples.

{{ include_html("snippets/fundamentos-ia/ia_ml_dl.html") }}

We now know how to identify which technological family a system uses. The second question is: **where does the signal that makes it learn come from?**

## 2. How do these systems learn?

These are not types of models, but **different ways of constructing the learning signal**: in other words, what kind of teacher we use.

> Supervised / unsupervised / self-supervised / reinforcement learning (RL) describe **where the teacher comes from**.

{{ include_html("snippets/fundamentos-ia/tipos_aprendizaje.html") }}

We now know where the “teacher” comes from. The third question completes the framework: **what exactly changes inside the model when it learns?** The answer depends on the type of algorithm, and understanding it is what separates using AI from understanding AI.

## 3. How these systems are adjusted

Knowing **where the signal that makes a system learn comes from** (supervised / self-supervised / RL) is not enough.

The key is to understand **what is adjusted and how** so that the model improves.

### 3.1 The universal learning loop

1. **Train and predict** with the data it currently has.
2. **Measure the error** (or how well it separates / groups).
3. **Adjust something internal** to reduce that error.
4. **Repeat** many times.

> **Learning = changing internal parameters to make fewer mistakes on data similar to the training data.**

### 3.2 Why a model can learn today and work tomorrow

Models are trained on a **sample of the world** (the data available today) and are expected to capture **general patterns** that continue to hold in the future.

* If future data is **similar**, the model generalizes well.
* If it changes substantially (**data drift**), performance falls and it is advisable to **monitor** and **retrain**.

That is why it matters to know **what is being adjusted**, because each family of algorithms learns in a different way.
This is also a key factor because it means AI systems are not static. They need continuous maintenance and monitoring.

---

### 3.3 What is adjusted depending on the type of algorithm

Think of each algorithm as a machine with a type of **parameter**. Training means updating those parameters so that predictions fit better and better.

#### 1. Adjust **rules / decisions**: Decision Trees, Random Forest, XGBoost

**What changes internally:**

* The **questions** it asks (which variable to inspect).
* The **thresholds** for those questions (e.g. “more than X?”).
* The **structure** of the tree (which branches exist and how deep it goes).

> It is like building a **questionnaire**: “if A happens, ask B, otherwise ask C”.

**Loan-approval example:**

* First candidate rule: “monthly income above X?”: separates applications with greater repayment capacity.
* Then: “debt ratio below Y?”: refines the separation.
* Training = trying many questions/thresholds and keeping those that **best separate** applications that can be approved from those that should be rejected.

{{ include_html("snippets/fundamentos-ia/algoritmos/arboles_decision.html") }}

---

#### 2. Adjust **probabilities learned by counting**: Naive Bayes

**What changes internally:**

* Tables of **frequencies/probabilities**: which signals appear more often in each class.
* It treats signals as **almost independent** given the class, so that evidence can be combined simply.

> It is like keeping a **count**: “when it is spam, how many times do I see ‘free’? How many times ‘urgent’?”

**Spam example:**

* If “free” appears very often in spam and rarely in non-spam, that pushes the prediction toward spam.
* Training = updating those counts with many examples and turning them into probabilities.

{{ include_html("snippets/fundamentos-ia/algoritmos/naive_bayes.html") }}

---

#### 3. Adjust **groups by feature similarity**: Clustering, k-means

**What changes internally:**

* The **position** of the group “centers” (each center is called a *prototype*).

**Note:** what “similar” means depends on the **distance** you use and on how you **scale** the variables.

> It is like placing **magnets** on a map: each data point goes to the nearest magnet, then you move the magnets to the center of each group.

**Example:**

* Group customers by behavior (frequency, spending, channels) without prior labels, using only the raw data.
* Training = repositioning the centers so that points are **as close as possible** to their group (more similar customers, closer together).

{{ include_html("snippets/fundamentos-ia/algoritmos/kmeans.html") }}

---

#### 4. Adjust **numerical weights** (Neural networks)

**What changes internally:**

* The **weights** (and **biases**) in the connections are numbers that indicate **how much influence** each input signal has when combined.
* In deep networks, there are **millions** of weights distributed across layers.

> Each neuron calculates a **weighted sum** and then applies an **activation function**, which lets the system learn non-linear concepts.

<details markdown="1">
<summary><strong>Technical deep dive (optional)</strong></summary>

**Two typical roles of the activation function:**

* In **internal layers**: it adds non-linearity (capacity).
* At the **output**: it turns a score into something interpretable (e.g. a probability with *sigmoid/softmax*).

**Why the activation function matters:**

* Without activation, several consecutive layers would be equivalent to a single linear transformation, so the model would be too rigid.
* The activation introduces **non-linearity**, which lets the model capture relationships such as “if A and B happen, but not C…”, curves, soft thresholds, etc.
* It also affects training: the type of activation influences how easy or difficult it is to adjust weights in deep layers.

**The 4 minimum pieces needed to make the adjustments:**

* **Activation function**: lets systems learn **non-linear** concepts.
* **Loss function**: a measure of the “failure” (how wrong the model was).
* **Backpropagation**: distributes responsibility for the error across the weights (which weights contributed most to the failure).
* **Optimizer**: decides how much to move each weight at each step (small, repeated steps).
</details>

**Spam example:**

* Signals: “free”, “urgent”, “many links”…
* The network combines signals with weights, passes through activations and produces a score/probability.
* If it fails, it adjusts weights/biases so that next time “free” carries more or less weight, etc.

{{ include_html("snippets/fundamentos-ia/redes_neuronales.html") }}

---

### 3.4 What type of data each family is useful for

Not every family is equally suitable for every problem. The type of data is often the first decision filter:

| Family | Data where it works well | Where it fails or is not the first choice |
|---------|--------------------------|-------------------------------------------|
| **Trees** (Decision Tree, Random Forest, XGBoost) | Structured tabular data: numbers, categories, mixed variables. A favorite for business data and Kaggle competitions with tables. | Images, audio, raw text without preprocessing. |
| **Naive Bayes** | Text (bag of words, token frequencies), categorical data with few correlations between variables. Very fast with little data. | Continuous data with strong correlations; complex relationships between variables. |
| **K-means** (clustering) | Continuous numerical data where Euclidean distance makes sense: coordinates, scaled behavioral metrics. | Text, high-dimensional data without prior reduction, purely categorical variables. |
| **Neural networks** | Images, audio, text, time series, video. They shine when the data volume is large and the pattern is complex. | Small tabular datasets: trees often win with lower computational cost. |

> **These four families illustrate the spectrum of adjustment mechanisms, not the whole map.** There are dozens more: SVMs, logistic/linear regression, Gaussian mixture models, Bayesian networks, time-series models (ARIMA, Prophet), ensemble methods, etc. Choosing an algorithm always starts by understanding the type of data and the objective of the problem.

These three axes (**technological family, learning type, adjustment mechanism**) let us describe any modern AI system. But they all share something: where the logic that makes them work comes from.

## 4. Classical software vs AI

Everything above describes a different way of defining the logic of a solution. It does not change how code is written, but rather where the logic that makes the system work comes from.

In classical software:

* **Input data + human-written rules → output**

Example: converting Fahrenheit to Celsius with a fixed formula.

* The programmer explicitly writes the rule: **C = (F - 32) x 5/9**
* If the same Fahrenheit value comes in, the same Celsius value always comes out.

In AI:

* **Input data + output data → learned rules**
* The “algorithm”, the mathematical formula, emerges from training.

Example: using many **(Fahrenheit, Celsius)** pairs so that the system learns the conversion.

* You no longer write the exact formula by hand.
* The model adjusts parameters and learns an approximate rule that then generalizes to new values.

This is the basic principle of so-called **Software 2.0**: the logic is no longer written, it is learned.

This does not yet change how software itself is built, but how solutions are built using AI. The leap in the way software is developed will arrive with LLMs.

This paradigm shift did not happen all at once. There were decades of advances, failures and leaps that explain where we are today and where we are going.

## 5. Major milestones

There is no need to memorize the whole chronology.
The important thing is to see **what changed in each wave**.

| Date | Major milestone | What changes |
| --- | --- | --- |
| **1950** | **Turing** ([paper][hito-turing]) | Establishes the conceptual framework for “intelligence in machines”. |
| **1955–1956** | **Dartmouth Conference** ([proposal][hito-dartmouth]) | The field of AI is formally born. |
| **1958–1959** | **Perceptron and early demonstrations of machine learning** ([paper · Rosenblatt][hito-perceptron], [paper · Samuel][hito-samuel]) | The idea of learning from data appears, rather than only from rules. |
| **1980s** | **Expert systems** ([XCON case][hito-xcon]) | First business wave of rule-based AI. |
| **1986** | **Backpropagation** ([paper][hito-backprop]) | Training multilayer neural networks becomes viable. |
| **1997** | **Deep Blue** ([IBM][hito-deepblue]) | A specialized AI defeats the world chess champion and makes the power of narrow AI visible. |
| **2012** | **AlexNet + ImageNet** ([paper][hito-alexnet], [ILSVRC][hito-imagenet]) | The modern era of deep learning scaled with data and GPUs begins. |
| **2017** | **Transformer — “Attention is all you need”** ([paper][hito-transformer]) | The base architecture of modern language models appears. |
| **2020–2022** | **GPT-3, AlphaFold and ChatGPT** ([article · GPT-3][hito-gpt3], [CASP14][hito-casp14], [Nature paper · AlphaFold][hito-alphafold-paper], [announcement · ChatGPT][hito-chatgpt]) | Foundation models, direct scientific impact and mass adoption arrive. |

If you want an even simpler mental picture, read it like this:

> **rules** -> **statistical learning** -> **deep learning** -> **foundation models** -> **useful AI at scale**

All that research culminates in capable and efficient systems. But a capable model is not yet a product.
For an AI system to work reliably in the real world, a complete engineering cycle is required.

## 6. MLOps: the complete cycle for AI to work in the real world

MLOps is the “engineering” part that makes AI work reliably in the real world: not only today, but also three months from now when the data, the market or user behavior has changed. ([Google Cloud](https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning))
The key idea:

> A trained model ≠ AI in production.
> In production you need a complete cycle: data → training → deployment → monitoring → improvement.

The clearest way to understand MLOps is as a chain of 8 steps. If one is missing, you normally have a demo, not a product.

1. Data (capture): collect signals from the real world (events, transactions, documents, logs).
2. Data (prepare): clean and turn data into useful variables (what the model “understands”).
3. Train: the model learns patterns from historical examples.
4. Evaluate: check that it works “well enough” before touching production.
5. Version: record which model it is and which data/version it was trained with (traceability).
6. Deploy: put it to work (API or batch), ideally gradually.
7. Monitor: check whether the world changes (data), whether the system is healthy (latency/errors) and whether performance falls.
8. Feedback and improvement: when the “truth” arrives (real labels), correct, retrain or roll back.

{{ include_html("snippets/fundamentos-ia/mlops/ciclo_mlops.html")}}

!!! tip "Next reading"
    The next chapter goes deeper into the most disruptive type of system of the last decade: [Chapter 2 — What is Generative AI? →](./02-que-es-ia-generativa.md)

## 7. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **OECD** — *Explanatory Memorandum on the Updated OECD Definition of an AI System* ([OECD][1]) | Clarifies the modern definition of an AI system. |
| R2 | **ISO/IEC 22989:2022** — *Artificial intelligence — Concepts and terminology* ([ISO][5]) | Core vocabulary and concepts in the field. |
| R3 | **Tom M. Mitchell** — *Machine Learning* ([CMU School of Computer Science][2]) | Formally defines learning with E/T/P. |
| R4 | **Y. LeCun, Y. Bengio, G. Hinton (2015)** — *Deep Learning* ([Nature][3]) | Short overview of the deep-learning revolution. |
| R5 | **I. Goodfellow, Y. Bengio, A. Courville** — *Deep Learning* ([Deep Learning Book][6]) | Technical foundation for modern neural networks. |
| R6 | **R. S. Sutton, A. G. Barto** — *Reinforcement Learning: An Introduction* ([Incomplete Ideas][7]) | Classical reference for reinforcement learning. |
| R7 | **R. Wirth, J. Hipp** — *CRISP-DM: Towards a Standard Process Model for Data Mining* ([cs.unibo.it][8]) | Standard process for data and ML projects. |
| R8 | **D. Sculley et al. (2015)** — *Hidden Technical Debt in Machine Learning Systems* ([NeurIPS Papers][4]) | Explains why a model alone is not enough for a real system. |

</details>

[1]: https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/03/explanatory-memorandum-on-the-updated-oecd-definition-of-an-ai-system_3c815e51/623da898-en.pdf "Explanatory memorandum on the updated OECD definition ..."
[2]: https://www.cs.cmu.edu/~tom/files/MachineLearningTomMitchell.pdf "Mitchell. "Machine Learning.""
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
| H1 | Alan Turing — *Computing Machinery and Intelligence* ([paper][hito-turing]) | Conceptual framework for intelligence in machines. |
| H2 | Dartmouth Summer Research Project on Artificial Intelligence (1955) ([proposal][hito-dartmouth]) | Foundational act of the field of AI. |
| H3 | Frank Rosenblatt — *The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain* ([paper][hito-perceptron]) | First major step toward learning from data. |
| H4 | Arthur Samuel — *Some Studies in Machine Learning Using the Game of Checkers* ([paper][hito-samuel]) | First practical demonstration that a machine can learn to play better than its programmer. |
| H5 | XCON / expert systems in production at Digital Equipment Corporation ([XCON case][hito-xcon]) | Industrial rise of rule-based AI. |
| H6 | Rumelhart, Hinton, Williams — *Learning representations by back-propagating errors* ([paper][hito-backprop]) | Makes it viable to train multilayer neural networks. |
| H7 | IBM — Deep Blue vs Kasparov (1997) ([IBM][hito-deepblue]) | Demonstrates the power of specialized AI in a concrete domain. |
| H8 | AlexNet — *ImageNet Classification with Deep Convolutional Neural Networks* (2012) ([paper][hito-alexnet]) | Triggers the modern era of visual deep learning. |
| H9 | ImageNet / ILSVRC ([ILSVRC][hito-imagenet]) | Benchmark that accelerates progress in computer vision. |
| H10 | AlphaGo (2016) — *Mastering the game of Go with deep neural networks and tree search* ([Nature paper][hito-alphago]) | Combines deep learning and search: first system to surpass the best humans at Go. |
| H11 | AlphaGo vs Lee Sedol (2016) ([DeepMind page][hito-alphago-match]) | The public milestone that made that technical leap visible globally. |
| H12 | *Attention Is All You Need* — Transformer (2017) ([paper][hito-transformer]) | Base architecture of today's language and image models. |
| H13 | BERT (2019) — *Pre-training of Deep Bidirectional Transformers for Language Understanding* ([paper][hito-bert]) | Consolidates bidirectional pretraining in NLP. |
| H14 | GPT-3 (2020) — *Language Models are Few-Shot Learners* ([OpenAI article][hito-gpt3]) | Scales language foundation models to an unprecedented level. |
| H15 | CASP14 / AlphaFold (2020–2021) ([CASP14][hito-casp14], [Nature paper][hito-alphafold-paper], [DeepMind blog][hito-alphafold-blog]) | Solves the protein-folding problem: the first direct scientific impact of AI at that scale. |
| H16 | ChatGPT (2022) ([OpenAI announcement][hito-chatgpt]) | Popularizes generative AI at scale with the general public. |
| H17 | University of Reading — Turing Test 2014 ([article][hito-turing2014]) | Popular reference in the debate around the Turing test. |
| H18 | *AlphaGo — The Movie* (2017, dir. Greg Kohs) ([documentary · YouTube][hito-alphago-doc]) | Documentary following the preparation for the match against Lee Sedol from the inside. Recommended for understanding the human and technical impact of the milestone. |
| H19 | *AlphaFold: The making of a scientific breakthrough* — DeepMind (2021) ([video · YouTube][hito-alphafold-doc]) | DeepMind documentary video about the process and impact of AlphaFold. Recommended before reading the paper. |

</details>

[hito-turing]: https://academic.oup.com/mind/article-abstract/LIX/236/433/986238 "Computing Machinery and Intelligence"
[hito-dartmouth]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/1904 "A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence"
[hito-perceptron]: https://deeplearning.cs.cmu.edu/S24/document/readings/Rosenblatt_1959-09865-001.pdf "The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain"
[hito-samuel]: https://people.csail.mit.edu/brooks/idocs/Samuel.pdf "Some Studies in Machine Learning Using the Game of Checkers"
[hito-xcon]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/download/460/396 "R1 and Beyond: AI Technology Transfer at Digital Equipment Corporation"
[hito-backprop]: https://www.nature.com/articles/323533a0.pdf "Learning representations by back-propagating errors"
[hito-deepblue]: https://www.ibm.com/history/deep-blue "Deep Blue"
[hito-alexnet]: https://proceedings.neurips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf "ImageNet Classification with Deep Convolutional Neural Networks"
[hito-imagenet]: https://image-net.org/challenges/LSVRC/ "ImageNet Large Scale Visual Recognition Challenge"
[hito-alphago]: https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf "Mastering the game of Go with deep neural networks and tree search"
[hito-alphago-match]: https://deepmind.google/research/alphago/ "AlphaGo"
[hito-transformer]: https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html "Attention Is All You Need"
[hito-bert]: https://aclanthology.org/N19-1423/ "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
[hito-gpt3]: https://openai.com/index/language-models-are-few-shot-learners/ "Language models are few-shot learners"
[hito-casp14]: https://predictioncenter.org/casp14/doc/CASP14_press_release.html "CASP14 press release"
[hito-alphafold-paper]: https://www.nature.com/articles/s41586-021-03819-2.pdf "Highly accurate protein structure prediction with AlphaFold"
[hito-alphafold-blog]: https://deepmind.google/blog/alphafold-a-solution-to-a-50-year-old-grand-challenge-in-biology/ "AlphaFold: a solution to a 50-year-old grand challenge in biology"
[hito-chatgpt]: https://openai.com/index/chatgpt/ "Introducing ChatGPT"
[hito-turing2014]: https://archive.reading.ac.uk/news-events/2014/June/pr583836.html "Turing Test success marks milestone in computing history"
[hito-alphago-doc]: https://www.youtube.com/watch?v=WXuK6gekU1Y "AlphaGo — The Movie (2017)"
[hito-alphafold-doc]: https://www.youtube.com/watch?v=gg7WjuFs8F4 "AlphaFold: The making of a scientific breakthrough — DeepMind"

---

## Frequently asked questions

**What is the difference between Deep Learning and Machine Learning?**
Deep Learning is a specialized type of Machine Learning that uses neural networks with many layers to handle complex data such as images, audio or language. ML learns patterns in order to generalize; DL emulates the structure of neural connections in the brain for advanced perception tasks that other algorithms do not reach.

**How can a system learn without anyone telling it the correct answer?**
Through two different routes. In unsupervised learning, the system looks for structure in unlabeled data, such as grouping customers by behavior. In self-supervised learning, the data itself creates the signal: for example, a language model predicts the next token using the preceding text as the “answer”, without any human having annotated it.

**Why is logic learned rather than written in AI?**
In traditional software the programmer defines the rules explicitly. In AI, input and output data cause the logic to emerge from training: the programmer designs the learning process, but the concrete logic that solves the problem is discovered by the model itself. You do not write the formula; you learn it.

**What physically changes inside a neural network when the model learns?**
Millions of numerical weights distributed across the connections between layers are adjusted. Backpropagation distributes responsibility for the error across those weights and the optimizer decides how much to move each one at every step in order to reduce the accumulated error.