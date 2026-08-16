---
title: AI and GDP today — real impact and early signals
description: Why AI's macroeconomic impact takes time to appear in GDP, where it appears earlier, and which signals are most indicative of what is happening.
date: 2026-04-10
keywords: "AI GDP impact, AI productivity J curve, generative AI productivity, economic growth AI, AI adoption signals, Brynjolfsson productivity, Goldman Sachs AI, Acemoglu AI macroeconomics"
tags:
  - Economics
  - AI
  - Productivity
---

# Chapter 4 — AI and GDP today: real impact, lags and early signals

This chapter examines why AI's macroeconomic impact takes time to appear in GDP, where it appears earlier, and which signals are the best leading indicators of real impact. By the end, the reader will understand Brynjolfsson's productivity J-curve, know the strongest field studies on task-level gains, and have the range of available macroeconomic forecasts (Goldman Sachs, PwC, Acemoglu) together with the argument behind each one.

!!! info "Prerequisites"
    This chapter assumes you know the concepts introduced in [Chapter 3 — Measurement: GDP vs well-being](./03-pib-vs-bienestar.md).

Aggregate productivity data do not yet show a jump comparable to the one produced by the computerization of the 1990s. But that does not mean nothing is happening. It means the measuring instrument — GDP and national-scale multifactor productivity — captures these effects late, with a lag, and sometimes misses them altogether.

Economists who study general-purpose technologies have a name for this phenomenon: the productivity J-curve, an initial decline before the recovery that reflects reorganization costs incurred before value is captured [Brynjolfsson et al. (2021)](https://www.nber.org/papers/w25148).

{{ include_html("snippets/ia-pib-energia/series_energy_ai_04_gdp.html") }}

---

## 1. Why macro impact takes time to arrive

The history of general-purpose technologies — technologies with the potential to affect the whole economy — shows a repeated pattern: productivity impact appears decades after the technology is widely adopted.

Economist Robert Gordon documented this phenomenon for industrial electrification [Gordon (2016)](https://press.princeton.edu/books/hardcover/9780691147727/the-rise-and-fall-of-american-growth). The first factories that installed electric motors did not immediately change their productivity dramatically: they simply replaced mechanical transmission with electric power while keeping the same machine layout. The productivity jump came when engineers realized that electricity allowed them to reorganize the plant completely, deliver power exactly where it was needed, and design processes that were impossible with centralized transmission. That took twenty or thirty years.

The same pattern appears with computing. The first business computers automated exactly what had previously been done by hand, without changing the processes. The jump arrived when processes were redesigned to exploit what computers could do that manual work could not.

With AI, we are at an early stage of that cycle.

### The four mechanisms behind the lag

**Slow diffusion.** Adoption of a new technology is not instantaneous. Companies need time to learn how to use it, evaluate whether it is worth the investment, and find the use cases where the return is real. Generative AI has been broadly available since 2022–2023 and many companies are still in an exploration phase.

**Process reorganization.** To capture AI's value, companies need to change how they work, not merely add a tool to an existing process. That requires organizational change, overcoming internal resistance, and time.

**Intangible capital.** AI's value inside a company is not only in the software but also in knowing how to use it, the proprietary data that feed it, and the processes redesigned to take advantage of it. That intangible capital does not appear on balance sheets or in GDP.

**Complementarities.** AI creates more value when it complements other investments: training for the workers who use it, data infrastructure that feeds it, and management systems that incorporate its outputs. The full impact arrives when all those pieces are in place, not when the first model is installed.

{{ include_html("snippets/ia-pib-bienestar-energia/04-jcurva-productividad.html") }}

---

## 2. Where it appears before GDP

If GDP does not capture the short-term impact, where does it appear?

### Productivity on specific tasks

Studies at the task level, rather than the company or economy level, show consistent gains. Studies by economists at MIT, Harvard and Stanford on the use of AI assistants for coding, writing, data analysis and customer response show time reductions of 20% to 50% on those tasks depending on the context [Brynjolfsson et al. (2023)](https://www.nber.org/papers/w31161). In legal tasks, field studies have documented time savings of between 12% and 32% [Goldman Sachs (2023)](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html), and in software development, experiments with coding assistants show increases in task-completion rates of around 26% [Peng et al. (2023)](https://arxiv.org/abs/2302.06590).

What is new in 2026 is that the unit of analysis is beginning to move from the "point copilot" toward the agent that executes longer work. Based on a sample of individual Codex users, OpenAI estimates that in May 2026, 80.6% had made at least one request equivalent to more than 30 minutes of human work, 70.2% at least one request over one hour, and 25.6% at least one request over eight hours [OpenAI (2026)](https://openai.com/index/how-agents-are-transforming-work/). This is not a conventional productivity survey: OpenAI estimates human task duration using an AI judge on a small sample, but the result does point to a relevant change in how these tools are used.

Anthropic reports a similar signal from within its own organization. In its report on internal Claude use, employees reported average productivity gains close to 50%, and the company says merged PRs per engineer per day increased by 67% after adopting Claude Code [Anthropic (2026)](https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic). It is an internal, self-reported source and therefore should not be read as a universal effect. But it is useful because it measures the move from "help on a task" to "operational change in a team."

Those gains at the task, session or team level do not automatically produce the same percentage gain at the company or economy level, because saved time is not always redirected toward more productive tasks. The most honest evidence today does not say GDP will jump tomorrow: it says concrete work is already being done faster, with more delegation and with increasingly long task units.

{{ include_html("snippets/ia-pib-bienestar-energia/04-evidencia-sectorial.html") }}

### Previously unavailable capabilities

In some domains, AI does not merely accelerate existing tasks but makes tasks possible that were previously infeasible at any scale. The most documented case is protein-structure prediction: DeepMind's AlphaFold system accelerated the ability to predict a protein's three-dimensional shape from its sequence by a factor of approximately 45,000 relative to previous experimental methods. The value is not only speed but access: researchers without the resources for X-ray crystallography experiments can obtain protein structures in minutes, broadening participation in drug-development projects to institutions and countries that previously lacked the capacity to enter that field.

In manufacturing, early documented cases show a different kind of impact. ArcelorMittal and HeidelbergMaterials have reported reductions of between 2% and 5% in facility energy consumption thanks to AI systems that optimize production parameters in real time, an impact channel that labor-productivity metrics do not capture because AI acts as a control system for physical processes, not as a cognitive tool for the worker.

### Perceived quality

In many tasks, AI does not reduce time but improves the output while keeping time constant. An analyst can produce more complete reports, with more context and more variants, in the same time as before. A programmer can explore more design options before committing to one. A doctor can review relevant literature more broadly before making a decision.

That quality improvement is real and valuable but does not appear directly in traditional productivity metrics. The gap between user experience and aggregate production data appears repeatedly in adoption studies: surveys of users of AI tools in professional environments show that most report significant personal productivity gains, but when those gains are sought in institutional production data, the effects are systematically smaller than the self-reported gains or are not statistically detectable.

The most likely hypotheses are that the gains are redistributed toward tasks that did not exist before, are expressed as quality that the metrics do not capture, or are absorbed by reorganizing working time rather than by additional measurable output.

### Time saved on routine tasks

The most visible and immediate impact is the reduction in time devoted to tasks that are necessary but add little differentiated value: drafting standard communications, searching internal documentation, summarizing, translating content, and formatting data for reports.

{{ include_html("snippets/ia-pib-bienestar-energia/04-difusion.html") }}

---

## 3. New products and services that did not exist before

Part of the impact GDP captures poorly is the creation of products and services that did not exist before or were prohibitively expensive.

Personalization at scale is the clearest example: before AI, personalizing each customer's experience required human work that made the cost infeasible at scale. AI allows communication, content and assistance to be personalized for millions of users simultaneously at very low marginal cost.

AI-assisted mental-health applications, personalized tutoring in education, programming assistants accessible to individual developers, and medical-imaging diagnostic systems that extend specialists' reach into areas without access are examples of value that simply was not available to those users before, or was available at a much higher cost.

That "new" value is difficult to measure because there is no direct comparison with what existed before.

---

## 4. The problem of mismeasured value

GDP has a systematic bias against goods and services whose price falls dramatically: when something goes from expensive to cheap, GDP can capture a reduction in spending even if real consumption rises and well-being improves.

Free or low-cost digital services are the most cited example: the value a person gets from a search engine, a messaging service or an AI assistant is not well reflected in GDP when that service is provided free or at a nominal price.

The same logic applies to AI: if AI enables a self-employed worker or an SME to produce work that previously required a larger team, GDP can see that change as a reduction in the labor market for that segment instead of an increase in productive capacity.

---

## 5. The most indicative early signals

The signals most likely to anticipate AI's future macroeconomic impact are:

**Active business adoption rate.** It is not enough for a company to "use" AI: what matters is the percentage that has redesigned real processes around it. McKinsey, OECD and Stanford HAI surveys track this with greater granularity than GDP. Available data show a widening gap: large companies are adopting generative AI at a rate more than 30 percentage points above small and medium-sized companies [McKinsey (2024)](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai). The same survey estimates that only 1% of companies have reached a level that can be considered mature AI deployment, defined as deep integration into business processes with documented return metrics, while the remaining 99% are in exploration, pilot or partial-adoption phases. That figure suggests most of the macroeconomic impact has yet to materialize.

**Productivity per worker in early-adoption sectors.** Technology, financial services, health and legal services are the sectors where gains appear first. If those gains accelerate, that is a leading signal.

**Training and workforce reorganization.** Companies that invest most in training teams to use AI effectively are the ones most likely to realize productivity gains. That is observable before it appears in GDP.

**New jobs and emerging roles.** Which new jobs AI creates, not only how many it eliminates, and whether those jobs have more or less added value than the ones they displace.

> AI's impact on GDP will arrive, but it will arrive late and unevenly across sectors, geographies and company sizes. What happens over the next few years with the distribution of those benefits will determine whether the final outcome improves well-being for the majority or concentrates the gains among a minority that already had them.

{{ include_html("snippets/ia-pib-bienestar-energia/04-brecha-adopcion.html") }}

The most optimistic projections [Goldman Sachs (2023)](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html) estimate a cumulative impact of up to $7 trillion on global GDP over ten years, with a 1.5 percentage-point increase in U.S. potential growth. PwC takes that estimate further: in its broad-adoption scenario, global impact could reach $15.7 trillion by 2030, with markedly uneven geographic distribution in which China would capture up to 26% of the additional growth and North America 14.5% [PwC (2023)](https://web.archive.org/web/20241015094323/https://www.pwc.com/gx/en/issues/artificial-intelligence/publications/artificial-intelligence-study.html). For the United States specifically, KPMG estimates a $2.84 trillion increase in GDP by that same year in its central scenario. All of these projections coexist with more cautious analyses: Daron Acemoglu of MIT argues that if AI only automates the most routine tasks and does not create new categories of value to a comparable degree, the aggregate impact on total factor productivity could remain below 0.53% cumulatively over a decade [Acemoglu (2024)](https://www.nber.org/papers/w32487). The difference between the two views is not technical but concerns what share of the economy can actually be transformed with current models.

{{ include_html("snippets/ia-pib-bienestar-energia/04-debate-proyecciones.html") }}

---

## Frequently asked questions

**Why is AI's impact still not visible in GDP if the technology is so powerful?**
General-purpose technologies have a historical pattern: their impact on macroeconomic productivity arrives with a lag of years or decades. Industrial electrification took thirty years to show its full effect because factories first had to be redesigned, not just have their motors replaced. Something similar is happening with AI: companies are in a learning and reorganization phase, the required intangible capital — usage knowledge, proprietary data, redesigned processes — is not measured well, and most adoption is still partial. Brynjolfsson calls this phenomenon the productivity J-curve: an apparent decline before the recovery.

**What is the productivity J-curve and how does it apply to AI?**
The J-curve describes the pattern in which adoption of a general-purpose technology first produces an apparent decline in measured productivity, because reorganization and training costs are immediate while benefits are deferred until complementary intangible capital accumulates. For AI, that means companies invest in tools, training and process redesign before the return appears in production data. The trap is interpreting that initial decline as evidence that the technology does not work, when it is actually the phase before the jump.

**Where are AI productivity gains already appearing?**
In specific, measurable tasks. The most documented gains are 20–50% in coding tasks (GitHub Copilot: +26% in task-completion rate), 12–32% in legal tasks, and +14% in cases resolved per hour in customer support (Brynjolfsson et al., 2023). In 2026, open evidence on coding agents adds another signal: OpenAI estimates that a significant share of Codex use already corresponds to tasks equivalent to more than one hour of human work, and Anthropic internally reports more productivity and more merged PRs after adopting Claude Code. In science, AlphaFold accelerated protein-structure prediction by a factor of 45,000. In manufacturing, early real-time optimization systems show 2–5% reductions in industrial-facility energy consumption. These gains at the task, session or team level do not always scale automatically to the company or economy level.

**How much could GDP grow because of AI according to the most cited studies?**
Estimates vary widely. Goldman Sachs projects up to $7 trillion of global impact over ten years. PwC raises that figure to $15.7 trillion by 2030 in its broad-adoption scenario. At the opposite extreme, Daron Acemoglu (MIT) argues that if AI only automates the most routine tasks without creating equivalent new categories of value, cumulative productivity impact could remain below 0.53% over a decade. The difference between the views is not primarily technical but concerns what fraction of the economy can be transformed with current models.

**Why do the gains reported by AI users not appear in macroeconomic data?**
Several hypotheses are not mutually exclusive: saved time can be redistributed toward activities that did not exist before or that indicators do not capture as additional production; improvements can be expressed in output quality — more complete reports, more variants analyzed — without increasing measurable quantity; or gains can be absorbed by internal reorganization of working time without generating visible additional output. The effect is systematic: adoption surveys show significant subjective gains that institutional production data either do not confirm or confirm only after a substantial lag.

---

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Brief description |
| --- | --- | --- |
| R1 | **Brynjolfsson, E., Li, D., Raymond, L.R. (2023)** — *Generative AI at Work* ([NBER][r1]) | Field experiment in customer support: +14% cases resolved per hour, with greater benefits for less-experienced workers. Empirical basis for the skill-democratization argument. |
| R2 | **Goldman Sachs (2023)** — *The Potentially Large Effects of Artificial Intelligence on Economic Growth* ([Goldman Sachs][r2]) | Macroeconomic projection: up to $7 trillion of impact on global GDP over 10 years, +1.5–2 pp potential growth in the U.S., and 60–70% of occupations containing substantially automatable tasks. Source for legal-task time-savings data. |
| R3 | **Acemoglu, D. (2024)** — *The Simple Macroeconomics of AI* ([NBER][r3]) | General-equilibrium analysis: if AI only automates 5% of tasks with economically viable short-term returns, cumulative TFP impact would remain below 1% over a decade. Counterweight to the optimism in R2. |
| R4 | **Gordon, R.J. (2016)** — *The Rise and Fall of American Growth* (Princeton UP) | History of U.S. productivity growth since 1870. Documents the lag between adoption of general-purpose technologies and their measurable macroeconomic impact. |
| R5 | **McKinsey & Company (2024)** — *The State of AI* ([McKinsey][r5]) | Annual survey of AI adoption across companies in 100+ countries. Source for the adoption gap between large companies and SMEs (more than 30 percentage points in active use with process redesign). |
| R6 | **Brynjolfsson, E. et al. (2021)** — *The Productivity J-Curve: How Intangibles Complement General Purpose Technologies* ([NBER][r6]) | Theoretical framework and empirical evidence for the J-curve pattern: TFP appears to fall before rising because the intangible capital — knowledge, processes, organization — required to complement the technology is not measured well until it accumulates. |
| R7 | **Peng, S. et al. (2023)** — *The Impact of AI on Developer Productivity: Evidence from GitHub Copilot* ([arXiv][r7]) | Controlled experiment: developers with access to GitHub Copilot completed coding tasks 55% faster in the experiment, with +26% in success rate on tasks representative of real work. |
| R8 | **PwC (2023)** — *Sizing the Prize: What's the real value of AI for your business?* ([PwC][r8]) | Projection of AI's global GDP impact: $15.7 trillion by 2030 in the broad-adoption scenario, with detailed geographic distribution (China +26% of additional growth, North America +14.5%). |
| R9 | **OpenAI (2026)** — *How agents are transforming work* ([OpenAI][r9]) | Report on Codex use: estimates tasks equivalent to more than 30 minutes, more than one hour and more than eight hours of human work. Useful as a signal of long-task delegation, not as a direct measure of aggregate productivity. |
| R10 | **Anthropic (2026)** — *How AI is transforming work at Anthropic* ([Anthropic][r10]) | Internal report on Claude and Claude Code use: self-reported productivity, newly enabled tasks and increased merged PRs per engineer per day after adopting Claude Code. |
| R11 | **METR (2026)** — *Update on measuring AI productivity uplift* ([METR][r11]) | Cautionary evidence on productivity measurement in software development: shows how difficult it is to turn tool usage into clean estimates of causal productivity. |

</details>

[r1]: https://www.nber.org/papers/w31161 "Generative AI at Work — NBER"
[r2]: https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html "The Potentially Large Effects of AI on Economic Growth — Goldman Sachs"
[r3]: https://www.nber.org/papers/w32487 "The Simple Macroeconomics of AI — NBER"
[r4]: https://press.princeton.edu/books/hardcover/9780691147727/the-rise-and-fall-of-american-growth "The Rise and Fall of American Growth — Princeton UP"
[r5]: https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai "The State of AI 2024 — McKinsey"
[r6]: https://www.nber.org/papers/w25148 "The Productivity J-Curve — NBER"
[r7]: https://arxiv.org/abs/2302.06590 "The Impact of AI on Developer Productivity: Evidence from GitHub Copilot — arXiv"
[r8]: https://web.archive.org/web/20241015094323/https://www.pwc.com/gx/en/issues/artificial-intelligence/publications/artificial-intelligence-study.html "Sizing the Prize — PwC"
[r9]: https://openai.com/index/how-agents-are-transforming-work/ "How agents are transforming work — OpenAI"
[r10]: https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic "How AI is transforming work at Anthropic — Anthropic"
[r11]: https://metr.org/blog/2026-02-24-uplift-update/ "Update on measuring AI productivity uplift — METR"