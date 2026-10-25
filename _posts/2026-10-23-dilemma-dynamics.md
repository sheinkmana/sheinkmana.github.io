---
layout: post
title: "Dilemma Dynamics: when better decisions fail to sustain cooperation"
date: 2026-10-23
last_modified_at: 2026-10-25
author: Alisa Sheinkman
description: "A completed 7,104-episode Nemotron evaluation: drafting improves average payoff decisions, yet weakens cooperation in autonomous self-play. Explore both temperatures, replay actions and reproduce the results."
tags: game-theory llm nemotron
categories: research
permalink: /blog/2026/dilemma-dynamics/
related_posts: false
---

*Exploring AI strategies, incentives and cooperation.*

A model can become better at exploiting a predictable opponent while becoming
worse at sustaining reciprocity. That tension is the central result of **Dilemma
Dynamics**, an interactive laboratory for AI decision-making in repeated games.
The final evaluation completed on **25 October 2026**. All **7,104 episodes** are
available to replay, with exact scores and a reproducible public analysis.

<p class="mb-4">
  <a class="btn btn-primary btn-lg" href="{{ '/dilemma-dynamics/#results' | relative_url }}">Explore the final results →</a>
  <a class="btn btn-outline-primary" href="{{ '/dilemma-dynamics/' | relative_url }}">Replay the decisions →</a>
</p>

## The experiment

In a Prisoner's Dilemma, mutual cooperation earns three points each. Defection
against cooperation earns five for the defector and zero for the cooperator;
mutual defection earns one each. Players maximise their own cumulative points.
Another encounter can make cooperation valuable, because today's choice changes
how a responsive opponent behaves tomorrow.

The experiment compares NVIDIA Nemotron Nano and Super under two procedures.
**Direct** makes one thinking-off action request. **Draft** first generates a
thinking-on draft capped at 1,024 tokens, then makes a separate thinking-off
action request capped at 128 tokens and conditioned on that draft. Both run at
**temperatures 0 and 1**, with top-p 1. Draft adds compute, an extra request and
conditioning together; its effects concern that complete bounded procedure.

Both temperatures were interleaved in one campaign on 24–25 October, with **48
matched environment blocks** and **3,552 episodes per temperature**. The benchmark
contains 6,144 episodes against disclosed Always Cooperate, Always Defect,
Tit-for-Tat and Grim policies. Another 960 autonomous dyads cover all ten
model/procedure pairings, including self-play. Four balanced strata vary the
neutral X/Y action mapping and display seat. A frozen rule selected the block
count from engineering cost and latency before scientific outcomes.

## Drafting improves the average, with a consistent opponent reversal

Against a disclosed rule, exact dynamic programming identifies the best
achievable expected own payoff. **Decision loss** measures the expected payoff
given up by each action, assuming optimal play afterward, and normalises for the
horizon. Lower loss is better. Cooperation has a separate interpretation: it can
preserve reciprocity, but sacrifices points against a partner who always cooperates.

| Model | Temperature | Direct mean loss | Draft mean loss | Draft − Direct | Approx. 98.75% interval |
|:------|------------:|-----------------:|----------------:|---------------:|:-----------------------|
| Nano | 0 | 0.6462 | 0.5374 | −0.1088 | [−0.1640, −0.0577] |
| Super | 0 | 0.4616 | 0.3720 | −0.0896 | [−0.1212, −0.0591] |
| Nano | 1 | 0.6541 | 0.4861 | −0.1680 | [−0.2172, −0.1209] |
| Super | 1 | 0.5988 | 0.3741 | −0.2246 | [−0.2795, −0.1742] |

Each arm/temperature mean has 768 benchmark episodes. All four planned intervals
lie below zero. They use 50,000 stratified whole-block bootstrap draws and
98.75% marginal intervals for an approximate four-comparison Bonferroni treatment;
coverage is not guaranteed. Relative loss reductions range from 16.8% to 37.5%.

The opponent breakdown changes the story. **Drafting increases average loss
against Tit-for-Tat in all four comparisons**, with effects from +0.1717 to
+0.3225. It improves all four means against Always Cooperate and Grim. Much of
the gain comes from recognising simple exploitation opportunities. Against TFT,
errors remain in regimes that reward alternation and in regimes that reward
sustained cooperation.

## Better benchmark performance does not ensure cooperative interaction

Every autonomous pairing has 48 dyads and 376 realised rounds per temperature.
Across pairings, mutual cooperation occurs in **330/3,760 rounds (8.8%) at zero**
and **353/3,760 (9.4%) at one**. These rounds share histories and are statistically
dependent. Changing both self-play agents from Direct to Draft lowers mutual
cooperation and joint-return point estimates for each model at each temperature.

Super at zero gives the clearest example. Direct self-play has **124/376 CC
rounds**, whereas Draft has **3/376**. Mean normalised joint return falls from
3.2063 to 1.8667; the paired difference is −1.3396, with exploratory nominal 95%
interval [−1.8375, −0.9042]. Direct never starts with mutual cooperation but later
returns to it in 82/218 eligible transitions. Draft never returns to CC in 325
opportunities. The initial choice and the capacity to repair a relationship are
different behaviours.

## Temperature, labels and planning expose remaining weaknesses

The six planned secondary temperature comparisons have nominal 95% intervals
without multiplicity correction. Super Direct improves at zero, Super Draft
changes little, Nano Draft worsens, and Nano Direct changes little. Both models'
drafting advantages narrow at zero. There is no uniform preferred temperature
across the procedures.

Two exploratory diagnostics are especially revealing:

- **Presentation sensitivity:** at zero, Nano's drafting effect reverses sign
  between X=cooperate and X=defect in both seats. Different stopping draws also
  differ across strata, so a fully crossed seed/mapping experiment would be
  needed to isolate the label effect.
- **Limited sustained planning:** against the committed TFT/Grim rules with ten
  announced rounds, nine C moves followed by D is optimal and earns 32 points.
  Only one of 768 episodes follows that path. Super Draft often plays the useful
  two-round TFT endgame while losing payoff earlier.

These patterns motivate hypotheses about shallow contingent planning, defensive
play that blocks repair, presentation habits, and interactions between sampling
and truncation. They remain hypotheses. Future tests could vary planning depth,
introduce controlled forgiving partners, cross every seed with every mapping,
and randomise draft caps while holding compute budgets comparable. The final
report develops these proposals alongside the related literature and Rasmusen's
repeated-game foundations.

## Infrastructure, recovery and reproducibility

The local CPU coordinator used remote Nebius Token Factory inference, native
Inspect AI samples/model events/scorers, and local MLflow Skinny tracking in
SQLite. Both integrations were used during execution. The canonical ledger
preserves requests, sealed choices, joint reveals, accounting and source hashes.
A provider-overload interruption at 3,406 episodes led to a separately approved
bounded transport amendment; all completed observations and the original deadline
were retained. The scientific stage finished in 16.16 hours, including recovery.

There were 62,832 successful requests plus 20 additional transmissions. Recorded
final usage is estimated at **\$17.1520**, with **\$0.6349** for engineering and
**\$0.32479584** still retained as uncertain maximum billing exposure. These are
usage estimates and exposure bounds, not provider invoices. Publication with
that uncertainty disclosed was explicitly approved under the existing additional
\$40 cap; no reservation was cleared. Draft costs approximately 10–12 times Direct
within the same model across both tracks, and 25–56% of successful drafts reach
their token cap.

This is the sole public final evaluation. Earlier outcomes informed the design
but are excluded. The package reproduces scores, planned comparisons and
exploratory diagnostics from saved actions, without further inference. Public
hashes check integrity; privately retained native logs support execution review.
Hosted responses are not guaranteed byte-identical, including at temperature zero.

- [Read the report and mathematical notes (PDF)]({{ '/dilemma-dynamics/research/paper/report.pdf' | relative_url }})
- [Read conclusions, methods and amendments]({{ '/dilemma-dynamics/FINAL_EVALUATION.md' | relative_url }})
- [Download temperature-0 actions]({{ '/dilemma-dynamics/research/temperature-zero/episodes.json' | relative_url }})
- [Download temperature-1 actions]({{ '/dilemma-dynamics/research/temperature-one/episodes.json' | relative_url }})
- [Download all planned contrasts (CSV)]({{ '/dilemma-dynamics/research/contrasts.csv' | relative_url }})
- [Download exploratory diagnostics (JSON)]({{ '/dilemma-dynamics/research/diagnostics.json' | relative_url }})
- [Inspect the publication/accounting review]({{ '/dilemma-dynamics/research/publication-review.json' | relative_url }})
- [Browse source and offline reproduction instructions](https://github.com/sheinkmana/dilemma-dynamics)

## Explore the app

Start with [Results]({{ '/dilemma-dynamics/#results' | relative_url }}) for the full
comparison, or [Study replay]({{ '/dilemma-dynamics/' | relative_url }}) to reveal
both players' choices together. Choose either temperature, all 48 blocks, any
benchmark condition or autonomous pairing. The initial example is chosen by
metadata, not outcome.

**Dilemma**, **Analysis** and **Board games** offer free browser play, lessons,
pause/resume, saved games and replay downloads. Tic-tac-toe and Dots & Boxes are
recreational extras outside this cooperation evaluation. The website sends no
inference requests. For live Nemotron play through Nebius, [launch the same app
locally](https://github.com/sheinkmana/dilemma-dynamics#run-locally); your key stays
on its localhost server and your model calls use your own account.
