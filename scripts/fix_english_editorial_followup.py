#!/usr/bin/env python3
"""Apply the second, human-reviewed English editorial cleanup for PR #213.

This migration is intentionally finite: normalize sentence-final punctuation copied
onto short fragment lists and rewrite the literal constructions confirmed during
ES→EN review of Foundations Chapters 1–2. It is not a generic prose rewriter.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
EN_ROOT = ROOT / "locales" / "en"
MANIFEST = EN_ROOT / "manifest.yml"
BULLET_RE = re.compile(r"^(?P<indent>\s*)(?P<marker>[-*+]\s+)(?P<body>\S.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)

REPLACEMENTS: dict[str, dict[str, str]] = {
    "series/fundamentos-ia-iag/01-que-es-ia.md": {
        "The chapter closes with MLOps, the engineering that turns a trained model into a product that works reliably in the real world.":
            "The chapter closes with MLOps: the engineering practices that turn a trained model into a reliable product.",
        "It is a family of **systems built to optimize a task** from data, with a measurable objective, and with the ability to improve through some mechanism of “learning”.":
            "It is a family of **systems built to optimize a task** against a measurable objective, often using data and some form of learning.",
        "Sometimes these systems classify, sometimes they predict, sometimes they decide and, in the most recent cases, they **generate content**.":
            "AI systems may classify, predict, make decisions or, more recently, **generate content**.",
        "To avoid confusing products, models and marketing, we are going to use a simple framework that lets us understand **any modern AI system**.":
            "To separate products, models and marketing claims, we'll use a simple framework that works across **modern AI systems**.",
        "We will answer each question in order.": "We'll take those questions in order.",
        "An effective way to visualize the hierarchy is the following:": "A useful way to see the hierarchy is:",
        "These are not types of models, but **different ways of constructing the learning signal**: in other words, what kind of teacher we use.":
            "These are not model types. They describe **how the learning signal is constructed**—in other words, where the supervision comes from.",
        "> Supervised / unsupervised / self-supervised / reinforcement learning (RL) describe **where the teacher comes from**.":
            "> Supervised / unsupervised / self-supervised / reinforcement learning (RL) describe **where the learning signal comes from**.",
        "We now know where the “teacher” comes from. The third question completes the framework: **what exactly changes inside the model when it learns?** The answer depends on the type of algorithm, and understanding it is what separates using AI from understanding AI.":
            "That answers where the learning signal comes from. The third question completes the framework: **what exactly changes inside the model during training?** The answer depends on the algorithm family.",
        "## 3. How these systems are adjusted": "## 3. What changes during training",
        "Knowing **where the signal that makes a system learn comes from** (supervised / self-supervised / RL) is not enough.":
            "Knowing **where the learning signal comes from** (supervised / self-supervised / RL) is not enough.",
        "The key is to understand **what is adjusted and how** so that the model improves.":
            "The next question is **what changes inside the model and how those changes improve performance**.",
        "* If it changes substantially (**data drift**), performance falls and it is advisable to **monitor** and **retrain**.":
            "* If it changes substantially (**data drift**), performance can fall, so the system needs **monitoring** and sometimes **retraining**.",
        "That is why it matters to know **what is being adjusted**, because each family of algorithms learns in a different way.\nThis is also a key factor because it means AI systems are not static. They need continuous maintenance and monitoring.":
            "What gets adjusted matters because different algorithm families learn in different ways. AI systems are not static products: they need ongoing monitoring and maintenance.",
    },
    "series/fundamentos-ia-iag/02-que-es-ia-generativa.md": {
        "Reading Chapter 1 before continuing is recommended.": "Reading Chapter 1 first is recommended.",
        "In the [previous chapter](./01-que-es-ia.md) we saw the different layers within AI, and now we are going to go deeper into one specific aspect of DL: generative AI.":
            "The [previous chapter](./01-que-es-ia.md) mapped the main layers of AI. Here we focus on one branch of deep learning: generative AI.",
        "The underlying mechanism is the same as in any ML system, with data coming in, parameters being adjusted, and error that we try to reduce at each phase of training.":
            "The training loop still follows the same broad ML pattern: data is processed, parameters are updated and an objective is optimized.",
        "What changed is what is learned and the scale at which it is applied. That change rests on three pieces that fit together in order:":
            "What changed is what is learned and the scale at which it is applied. Three connected ideas make that shift easier to understand:",
        "The solution happens through three chained steps.": "A common pipeline has three steps.",
        "First, text is divided into **tokens**: the smallest unit the model processes. A token can be a complete word, a syllable, or a punctuation mark; for example, the Spanish word «agente» is often tokenized as «ag» + «ente», rather than as a single unit. ([OpenAI Tokenizer](https://platform.openai.com/tokenizer))":
            "First, text is divided into **tokens**: the units the model processes. A token can be a whole word, part of a word or punctuation; for example, the Spanish word «agente» may be split into multiple subword tokens rather than represented as one token. ([OpenAI Tokenizer](https://platform.openai.com/tokenizer))",
        "What training adds is meaning to those vectors through semantics, through geometry.\nThe vectors are adjusted until words that appear in similar contexts end up close to one another.":
            "Training gives those vectors useful geometry. Tokens that appear in similar contexts tend to acquire related representations.",
        "That already-adjusted vector is called an **embedding** ([original paper][r2]).":
            "The resulting vector representation is called an **embedding** ([original paper][r2]).",
        "Text, images, and audio all go through the same process of being converted into vectors before they are processed, which allows one architecture to work across different modalities.":
            "Modern multimodal systems ultimately represent text, images and audio numerically, although each modality may use a different encoder or front end before those representations are processed together.",
        "With the representations solved, the next problem is processing them without losing the thread as sequences of those vectors become longer.":
            "Once inputs are represented numerically, the next challenge is processing long sequences while preserving useful context.",
    },
}


def published_routes() -> list[str]:
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return [
        str(route)
        for route in manifest.get("published_routes") or []
        if str(route).endswith(".md") and (EN_ROOT / str(route)).is_file()
    ]


def visible_body(body: str) -> str:
    return re.sub(r"\s*<!--.*?-->\s*$", "", body).rstrip()


def normalize_fragment_list_punctuation(path: Path) -> int:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    changed = 0
    in_frontmatter = bool(lines and lines[0].strip() == "---")
    in_fence = False
    block: list[tuple[int, str, str]] = []
    previous_line: int | None = None
    previous_indent: str | None = None

    def flush() -> None:
        nonlocal changed, block
        if len(block) >= 3:
            bodies = [item[2] for item in block]
            counts = [len(WORD_RE.findall(re.sub(r"[`*_\[\]()]", " ", body))) for body in bodies]
            endings = [body[-1] if body and body[-1] in ".!?" else "bare" for body in bodies]
            # High-confidence Spanish-list artifact: every earlier item is a
            # short bare fragment and only the final item carries a period.
            if all(count <= 12 for count in counts) and endings[-1] == "." and all(end == "bare" for end in endings[:-1]):
                index = block[-1][0]
                raw = lines[index]
                newline = "\n" if raw.endswith("\n") else ""
                line = raw[:-1] if newline else raw
                comment_match = re.match(r"^(?P<main>.*?)(?P<comment>\s*<!--.*?-->\s*)$", line)
                main = comment_match.group("main") if comment_match else line
                comment = comment_match.group("comment") if comment_match else ""
                if main.rstrip().endswith("."):
                    lines[index] = f"{main.rstrip()[:-1]}{comment}{newline}"
                    changed += 1
        block = []

    for index, raw in enumerate(lines):
        line_no = index + 1
        line = raw.rstrip("\n")
        if in_frontmatter:
            if index > 0 and line.strip() == "---":
                in_frontmatter = False
            continue
        if FENCE_RE.match(line):
            flush()
            in_fence = not in_fence
            previous_line = None
            previous_indent = None
            continue
        if in_fence:
            continue

        match = BULLET_RE.match(line)
        if not match:
            if block and previous_line is not None and line_no > previous_line + 1:
                flush()
                previous_indent = None
            continue

        indent = match.group("indent")
        adjacent = previous_line is not None and line_no <= previous_line + 2
        if block and (not adjacent or indent != previous_indent):
            flush()
        block.append((index, raw, visible_body(match.group("body"))))
        previous_line = line_no
        previous_indent = indent

    flush()
    if changed:
        path.write_text("".join(lines), encoding="utf-8")
    return changed


def apply_replacements(route: str, path: Path) -> int:
    replacements = REPLACEMENTS.get(route, {})
    text = path.read_text(encoding="utf-8")
    original = text
    count = 0
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
            count += 1
    if text != original:
        path.write_text(text, encoding="utf-8")
    return count


def main() -> int:
    total = 0
    touched: list[tuple[str, int]] = []
    for route in published_routes():
        path = EN_ROOT / route
        count = normalize_fragment_list_punctuation(path) + apply_replacements(route, path)
        if count:
            total += count
            touched.append((route, count))

    print(f"fixed {total} reviewed editorial artifacts across {len(touched)} routes")
    for route, count in touched:
        print(f"  {count:3} {route}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
