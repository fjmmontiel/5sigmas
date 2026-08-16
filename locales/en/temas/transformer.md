---
title: "How the Transformer works"
seo_title: "How the Transformer works: attention and architecture step by step"
description: "Technical explanation of the Transformer: embeddings, self-attention, residual blocks, encoder, decoder, cost and architectural limits."
keywords: "Transformer, self-attention, Transformer architecture, Query Key Value, encoder decoder, LLM"
date: 2026-04-07
date_modified: 2026-08-16
---

# How the Transformer works

The **Transformer** is a neural architecture that processes a sequence through attention. Each position can combine information from other positions without traversing them one by one as a recurrent network does. That property made training highly parallelizable and enabled models for text, images, audio and video to scale.[^transformer]

Attention is the distinctive operation, but a complete Transformer also needs embeddings, positional information, projections, feed-forward networks, residual connections and normalization.

## The architecture in one view

{{ include_html("snippets/temas/transformer-block.html") }}

In an autoregressive model, the final representation is projected onto the vocabulary to produce next-token probabilities.

## 1. Embeddings and positional information

A token begins as an integer identifier. A learned matrix turns it into a vector. Tokens that occur in similar contexts can end up with related representations.

Attention alone does not know order. The model must add or otherwise incorporate position. The original paper used sinusoidal positional encodings added to the input embedding. Later architectures use learned positional embeddings, relative positions or rotational transformations such as RoPE.[^transformer][^rope]

{{ include_html("snippets/temas/transformer-embedding-position.html") }}

Position is not cosmetic: it lets the model distinguish who acts on whom even when a sequence contains nearly the same tokens. The exact mechanism is not universal; `embedding + position` describes the original Transformer, while RoPE incorporates position through rotations inside the attention computation.[^rope]

## 2. Query, Key and Value

Each representation is projected into three vectors:

- **Query (Q):** what information this position is looking for.
- **Key (K):** what signal each position offers to be matched.
- **Value (V):** what content it contributes if it receives attention.

Scaled attention connects four operations: projecting `Q`, `K` and `V`; computing compatibility; normalizing the weights; and mixing the values.[^transformer]

{{ include_html("snippets/temas/transformer-qkv.html") }}

The product `QKᵀ` calculates compatibility between positions. The `√d_k` factor controls logit scale. `softmax` turns each row into normalized weights. Multiplication by `V` produces a weighted combination of information.

The explanation “every word looks at all the others” is useful, though incomplete. Each head learns different projections and can specialize in different patterns.

## 3. Multi-head attention

Instead of running one attention operation over the full dimension, the block divides the representation into several **heads**. Each head computes its own `Q`, `K` and `V` matrices.

{{ include_html("snippets/temas/transformer-multihead.html") }}

One head may capture local dependencies. Another may relate distant entities. Another may help copy structure or track delimiters. There is no fixed universal assignment, but the separation increases the capacity to represent multiple relationships simultaneously.

## 4. Causal masking in generative models

An autoregressive decoder must not see the future during training. A triangular mask prevents position `t` from attending to later tokens.[^transformer]

{{ include_html("snippets/temas/transformer-causal-mask.html") }}

So although all known positions in a batch can be processed in parallel during training, every prediction follows the same contract that will exist during generation: it can only use the available prefix.

During inference, generation is still sequential because the next token does not exist until the previous one has been selected. The KV cache avoids recomputing keys and values for the whole prefix at each step.

## 5. The feed-forward network

After attention, each position passes through a dense network independently, using the same parameters for every position in that layer.[^transformer]

{{ include_html("snippets/temas/transformer-ffn.html") }}

In large models, this part contains a significant fraction of the parameters and compute. Modern architectures use activations and gates such as GELU, SwiGLU or related variants. *Mixture-of-experts* models replace one dense network with multiple experts and route each token to a subset of them.

## 6. Residuals and normalization

Each sub-block does not simply replace the representation it receives: it learns a transformation on top of a **residual path** that preserves the input. Normalization placement determines where the signal is modified before it continues through the stack of layers.

{{ include_html("snippets/temas/transformer-residual-norm.html") }}

The original Transformer used *post-norm*: it first adds the sublayer output to the residual path and normalizes afterwards.[^transformer] In *pre-norm*, normalization is applied inside the sublayer branch, leaving a direct identity path across layers. Xiong et al. analyze why that placement changes gradient behavior at initialization and can improve optimization stability.[^prenorm]

The same residual structure surrounds both attention and the feed-forward network. The exact normalization detail varies across model families, but the central idea remains: each sublayer learns a correction to a representation that can also advance through the residual path.

## Encoder, decoder and encoder-decoder

{{ include_html("snippets/temas/transformer-encoder-decoder.html") }}

BERT popularized bidirectional encoder stacks for representations useful in classification, extraction and language understanding.[^bert] GPT-style families popularized the causal decoder for generation. The original Transformer combined both: the encoder represented the full input and the decoder generated the output while consulting those representations through *cross-attention*.[^transformer]

“Transformer” therefore does not imply one single diagram. It describes a family of blocks and attention contracts.

## Why it displaced recurrent networks

RNNs and LSTMs update a state step by step. That creates a sequential dependency that is difficult to parallelize and forces distant information to travel through many steps.

{{ include_html("snippets/temas/transformer-rnn-vs-attention.html") }}

The advantage applies over positions already known during training: attention reduces the number of sequential operations within a layer and shortens the path between distant positions. The price is dense pairwise interaction, which matters increasingly as context grows.

## The cost of attention

For a sequence of length `n`, the `QKᵀ` matrix contains `n × n` elements. Its memory footprint and part of its compute grow quadratically with sequence length.

That does not mean total model cost is always `O(n²)`. Projections and feed-forward networks also matter, and optimized implementations avoid materializing some intermediates. But the growth of all-to-all interaction remains a structural limit for very long contexts.

{{ include_html("snippets/temas/transformer-attention-cost.html") }}

Research directions include:

- local or sparse attention;
- compression and external memory;
- retrieval of relevant chunks;
- more efficient kernels;
- state-space models;
- hybrid architectures.

Mamba showed that selective state-space models can process sequences with linear scaling and remain competitive across several domains.[^mamba] That does not make the Transformer obsolete. It opens another point in the design space.

## Transformers beyond text

The architecture operates on sequences of vectors, not exclusively on words.

Vision Transformer divides an image into patches, projects each patch to a vector and applies a Transformer encoder.[^vit] Audio systems can use frames or acoustic tokens. Video systems combine spatial and temporal structure. Multimodal models can align text, image and audio in shared spaces or connect them through cross-attention.

The [Multimodality in Generative AI](/en/series/multimodalidad-iag/00_presentacion_serie/) series develops those design choices.

## What the architecture does not explain by itself

Knowing the Transformer is not enough to explain a model's behaviour. Other important factors include:

- pretraining data;
- the loss objective;
- the tokenizer;
- scale and compute budget;
- instruction tuning;
- preference optimization;
- context and tools during inference.

Two models with similar blocks can behave very differently because of the rest of the system.

## Where to go deeper in 5sigmas

- [What is an LLM?](/en/temas/llms/) to connect the architecture to training and generation.
- [Scale](/en/series/from-cave-to-agi/04-escalar/) to understand why data, compute and parameters changed the field.
- [Beyond the Transformer](/en/series/from-cave-to-agi/05-mas-alla/) to explore memory, retrieval and alternative architectures.
- [Multimodal architectures](/en/series/multimodalidad-iag/03-arquitecturas/) to see how these blocks adapt to other modalities.

## Frequently asked questions

### Is attention the same thing as memory?

No. Attention combines representations available in the current context. A KV cache preserves keys and values for reuse during generation, but it is not persistent memory and does not guarantee remembering information between sessions.

### Why divide by the square root of the dimension?

As key dimensionality grows, dot products tend to have larger variance. Dividing by `√d_k` prevents overly extreme logits and keeps `softmax` in a more useful gradient regime.

### Do all Transformers generate text?

No. An encoder can produce representations or classifications. A Vision Transformer can classify images. Autoregressive generation is one configuration, not a required property.

### Does a larger context always improve the result?

No. It increases available information, but also cost and the difficulty of locating relevant evidence. Quality depends on position, noise, long-context training and retrieval strategy.

## Primary sources

[^transformer]: Ashish Vaswani et al., [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762), 2017.
[^rope]: Jianlin Su et al., [*RoFormer: Enhanced Transformer with Rotary Position Embedding*](https://arxiv.org/abs/2104.09864), 2021.
[^prenorm]: Ruibin Xiong et al., [*On Layer Normalization in the Transformer Architecture*](https://arxiv.org/abs/2002.04745), 2020.
[^bert]: Jacob Devlin et al., [*BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*](https://arxiv.org/abs/1810.04805), 2018.
[^vit]: Alexey Dosovitskiy et al., [*An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale*](https://arxiv.org/abs/2010.11929), 2020.
[^mamba]: Albert Gu and Tri Dao, [*Mamba: Linear-Time Sequence Modeling with Selective State Spaces*](https://arxiv.org/abs/2312.00752), 2023.
