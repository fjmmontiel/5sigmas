#!/usr/bin/env python3
"""Remove confirmed mechanical editorial artifacts from published English.

This remediation is deliberately narrow. It fixes punctuation copied from Spanish
lists, a handful of high-confidence literal constructions found by the site-wide
audit, and no other prose. The permanent audit remains the guardrail; this script
is only the migration tool used by PR #213.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
EN_ROOT = ROOT / "locales" / "en"
MANIFEST = EN_ROOT / "manifest.yml"
BULLET_RE = re.compile(r"^(?P<prefix>\s*[-*+]\s+)(?P<body>\S.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
COMMENT_RE = re.compile(r"(?P<visible>.*?)(?P<comment>\s*<!--.*?-->\s*)$")
WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)

EXACT_REPLACEMENTS: dict[str, dict[str, str]] = {
    "series/fundamentos-ia-iag/01-que-es-ia.md": {
        "The chapter closes with MLOps, the engineering that turns a trained model into a product that works reliably in the real world.":
            "The chapter closes with MLOps: the engineering practices that turn a trained model into a reliable product.",
        "It is a family of **systems built to optimize a task** from data, with a measurable objective, and with the ability to improve through some mechanism of “learning”.":
            "It is a family of **systems built to optimize a task** against a measurable objective, often using data and some form of learning.",
        "Sometimes these systems classify, sometimes they predict, sometimes they decide and, in the most recent cases, they **generate content**.":
            "AI systems may classify, predict, make decisions or, more recently, **generate content**.",
        "To avoid confusing products, models and marketing, we are going to use a simple framework that lets us understand **any modern AI system**.":
            "To separate products, models and marketing claims, we'll use a simple framework that works across **modern AI systems**.",
        "We will answer each question in order.":
            "We'll take those questions in order.",
        "An effective way to visualize the hierarchy is the following:":
            "A useful way to see the hierarchy is:",
        "These are not types of models, but **different ways of constructing the learning signal**: in other words, what kind of teacher we use.":
            "These are not model types. They describe **how the learning signal is constructed**—in other words, where the supervision comes from.",
        "> Supervised / unsupervised / self-supervised / reinforcement learning (RL) describe **where the teacher comes from**.":
            "> Supervised / unsupervised / self-supervised / reinforcement learning (RL) describe **where the learning signal comes from**.",
        "We now know where the “teacher” comes from. The third question completes the framework: **what exactly changes inside the model when it learns?** The answer depends on the type of algorithm, and understanding it is what separates using AI from understanding AI.":
            "That answers where the learning signal comes from. The third question completes the framework: **what exactly changes inside the model during training?** The answer depends on the algorithm family.",
        "## 3. How these systems are adjusted":
            "## 3. What changes during training",
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
        "Reading Chapter 1 before continuing is recommended.":
            "Reading Chapter 1 first is recommended.",
        "In the [previous chapter](./01-que-es-ia.md) we saw the different layers within AI, and now we are going to go deeper into one specific aspect of DL: generative AI.":
            "The [previous chapter](./01-que-es-ia.md) mapped the main layers of AI. Here we focus on one branch of deep learning: generative AI.",
        "The underlying mechanism is the same as in any ML system, with data coming in, parameters being adjusted, and error that we try to reduce at each phase of training.":
            "The training loop still follows the same broad ML pattern: data is processed, parameters are updated and an objective is optimized.",
        "What changed is what is learned and the scale at which it is applied. That change rests on three pieces that fit together in order:":
            "What changed is what is learned and the scale at which it is applied. Three connected ideas make that shift easier to understand:",
        "The solution happens through three chained steps.":
            "A common pipeline has three steps.",
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
    "series/fundamentos-ia-iag/01-que-es-ia.md": {
        "- **What type of AI application is it?**: the family/technology it uses":
            "- **What type of AI application is it?** The family or technology it uses",
        "- **How does it learn?**: where the “teacher” comes from":
            "- **How does it learn?** Where the learning signal comes from",
        "- **How is it adjusted?**: how the model changes during training":
            "- **What changes during training?** Which parts of the model are adjusted",
    },
    "series/from-cave-to-agi/05-mas-alla.md": {
        "- Search and verification over solution spaces,":
            "- Search and verification over solution spaces",
        "- Selective memory during inference,":
            "- Selective memory during inference",
        "- Continual learning across multiple timescales,":
            "- Continual learning across multiple timescales",
        "- Internal models of environments,":
            "- Internal models of environments",
        "- Systems capable of perceiving and acting in the physical world.":
            "- Systems capable of perceiving and acting in the physical world",
    },
}

# Merge duplicate dictionary entries above while keeping the source readable.
FOUNDATIONS_EXTRA = {
    "- **What type of AI application is it?**: the family/technology it uses":
        "- **What type of AI application is it?** The family or technology it uses",
    "- **How does it learn?**: where the “teacher” comes from":
        "- **How does it learn?** Where the learning signal comes from",
    "- **How is it adjusted?**: how the model changes during training":
        "- **What changes during training?** Which parts of the model are adjusted",
}
EXACT_REPLACEMENTS.setdefault("series/fundamentos-ia-iag/01-que-es-ia.md", {}).update(FOUNDATIONS_EXTRA)


def routes() -> list[str]:
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return sorted(
        str(route)
        for route in data.get("published_routes") or []
        if str(route).endswith(".md") and (EN_ROOT / str(route)).is_file()
    )


def clean_semicolon_bullets(path: Path) -> int:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    changed = 0
    in_frontmatter = bool(lines and lines[0].strip() == "---")
    in_fence = False

    for index, raw in enumerate(lines):
        newline = "\n" if raw.endswith("\n") else ""
        line = raw[:-1] if newline else raw

        if in_frontmatter:
            if index > 0 and line.strip() == "---":
                in_frontmatter = False
            continue
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        match = BULLET_RE.match(line)
        if not match:
            continue

        body = match.group("body")
        comment_match = COMMENT_RE.fullmatch(body)
        visible = comment_match.group("visible") if comment_match else body
        comment = comment_match.group("comment") if comment_match else ""
        stripped = visible.rstrip()
        if not stripped.endswith(";"):
            continue

        trailing_ws = visible[len(visible.rstrip()):]
        stripped = stripped[:-1].rstrip()
        lines[index] = f"{match.group('prefix')}{stripped}{trailing_ws}{comment}{newline}"
        changed += 1

    if changed:
        path.write_text("".join(lines), encoding="utf-8")
    return changed


def normalize_final_fragment_period(path: Path) -> int:
    """Remove a sentence-final period copied onto the last item of fragment lists."""
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    changed = 0
    in_frontmatter = bool(lines and lines[0].strip() == "---")
    in_fence = False
    block: list[tuple[int, str, str]] = []

    def flush() -> None:
        nonlocal changed, block
        if len(block) < 3:
            block = []
            return
        bodies = [visible for _, _, visible in block]
        word_counts = [len(WORD_RE.findall(re.sub(r"[`*_\[\]()]", " ", body))) for body in bodies]
        endings = [body[-1] if body and body[-1] in ".!?" else "bare" for body in bodies]
        if (
            all(count <= 12 for count in word_counts)
            and endings[-1] == "."
            and all(end == "bare" for end in endings[:-1])
        ):
            index, raw_line, visible = block[-1]
            newline = "\n" if raw_line.endswith("\n") else ""
            line = raw_line[:-1] if newline else raw_line
            # Keep any trailing HTML comment intact.
            comment_match = re.match(r"^(?P<main>.*?)(?P<comment>\s*<!--.*?-->\s*)$", line)
            main = comment_match.group("main") if comment_match else line
            comment = comment_match.group("comment") if comment_match else ""
            if main.rstrip().endswith("."):
                main = main.rstrip()[:-1]
                lines[index] = f"{main}{comment}{newline}"
                changed += 1
        block = []

    previous_line_no: int | None = None
    previous_indent: str | None = None
    for index, raw in enumerate(lines):
        line = raw.rstrip("\n")
        line_no = index + 1
        if in_frontmatter:
            if index > 0 and line.strip() == "---":
                in_frontmatter = False
            continue
        if FENCE_RE.match(line):
            flush()
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        match = BULLET_RE.match(line)
        if not match:
            if block and previous_line_no is not None and line_no > previous_line_no + 1:
                flush()
            continue
        indent = match.group("indent")
        body = re.sub(r"\s*<!--.*?-->\s*$", "", match.group("body")).rstrip()
        adjacent = previous_line_no is not None and line_no <= previous_line_no + 2
        same_indent = previous_indent == indent
        if block and (not adjacent or not same_indent):
            flush()
        block.append((index, raw, body))
        previous_line_no = line_no
        previous_indent = indent
    flush()

    if changed:
        path.write_text("".join(lines), encoding="utf-8")
    return changed


def apply_exact_replacements(route: str, path: Path) -> int:
    replacements = EXACT_REPLACEMENTS.get(route)
    if not replacements:
        return 0

    text = path.read_text(encoding="utf-8")
    original = text
    changed = 0
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
            changed += 1
    if text != original:
        path.write_text(text, encoding="utf-8")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    total = 0
    touched: list[tuple[str, int]] = []
    for route in routes():
        path = EN_ROOT / route
        original = path.read_text(encoding="utf-8")
        count = (
            clean_semicolon_bullets(path)
            + normalize_final_fragment_period(path)
            + apply_exact_replacements(route, path)
        )
        if count:
            touched.append((route, count))
            total += count
            if not args.write:
                path.write_text(original, encoding="utf-8")

    mode = "fixed" if args.write else "would fix"
    print(f"{mode} {total} mechanical English editorial artifacts across {len(touched)} routes")
    for route, count in touched:
        print(f"  {count:3} {route}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
