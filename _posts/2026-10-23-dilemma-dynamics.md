---
layout: post
title: "Dilemma Dynamics: replaying Nemotron's cooperation decisions"
date: 2026-10-23
last_modified_at: 2026-10-24
author: Alisa Sheinkman
description: "Exploring AI strategies, incentives and cooperation. Explore recorded Nemotron play and 3,552 cooperation-study episodes across temperatures 1 and 0, with no API key or inference charges."
tags: game-theory llm nemotron
categories: research
permalink: /blog/2026/dilemma-dynamics/
related_posts: false
---

*Exploring AI strategies, incentives and cooperation.*

Updated 24 October 2026 with both completed temperature studies.

<p class="mb-4">
  <a class="btn btn-primary btn-lg" href="{{ '/dilemma-dynamics/' | relative_url }}">Open the interactive Dilemma Dynamics demo →</a>
</p>

The demo opens **Study replay**: step through recorded Nemotron decisions,
reveal both players' actions together, and follow their points round by round.
Switch to **Results** to explore aggregate findings, compare opponents, and
download the report and public data. Everything in this demo uses saved results;
viewing it requires no API key and incurs no inference charges.

I built Dilemma Dynamics to explore how language-model agents respond to incentives.
Two completed temperature studies compare NVIDIA Nemotron Nano and Super in a repeated
Prisoner's Dilemma. Each round offers two actions: cooperate or defect.
Mutual cooperation earns each player three points; unilateral defection earns
five for the defector and zero for the cooperator; mutual defection earns one each.
The objective is each player's own cumulative points.

## A cooperation study and a recreational side project

Dilemma Dynamics' main project examines cooperation and incentives in the
repeated Prisoner's Dilemma. The full local app also contains a separate
recreational side project with Dots & Boxes and Tic-tac-toe, exploring tactical
play, search and decision inspection. The public demo here includes saved
dilemma episodes and Results only.

| Game | Choices and incentives |
|:-----|:-----------------------|
| Repeated Prisoner's Dilemma | Private simultaneous choices each round. Mutual cooperation earns 3 each; mutual defection earns 1 each. Both can gain together, while each faces an immediate temptation to defect. |
| Dots & Boxes | Visible sequential moves, with another move after a capture. At completion the number of boxes is fixed: one player's extra box is one fewer for the opponent. |
| Tic-tac-toe | Visible alternating moves with opposing win/draw/loss objectives. One player's win is the other's loss; perfect play draws. |

A player may deliberately give up boxes to win more later. That is a competitive
tactic within a fixed total, rather than a way to improve both final scores.
In the repeated dilemma, future responses can instead make cooperation valuable
to both players. The published 3,552 episodes across both temperatures concern the dilemma;
board-game matches and solver checks answer different questions.

## Does a draft help?

The study compares two procedures. **Direct** makes one thinking-off action
request. **Draft** first makes a bounded thinking-on draft request, then a
separate thinking-off action request conditioned on that draft. Both use
the selected study temperature, 1 or 0, with top-p 1. Direct allows 128 output
tokens; Draft allows 1,024 for the draft and 128 for the action. This comparison includes extra compute and an extra request;
it does not isolate the effect of reasoning at equal cost.

Each temperature completed the same **24-block / 1,776-episode schedule**: 1,536
episodes against four disclosed, committed opponent policies and 240 autonomous
model dyads spanning all ten model/procedure pairings. That is **3,552 episodes**
in total, with matched IDs, episode order, stopping lengths, labels and seats.
The studies ran on 22 October (temperature 1) and 23 October (temperature 0).

In the committed-opponent benchmark, lower loss means fewer points left on
the table relative to the exact reference policy for that condition.

| Model | Temperature | Direct mean loss | Draft mean loss | Draft − Direct | Approx. 95% interval |
|:------|------------:|-----------------:|----------------:|---------------:|:---------------------|
| Nemotron Nano | 1 | 0.6889 | 0.4942 | −0.1947 | [−0.3077, −0.0983] |
| Nemotron Super | 1 | 0.6150 | 0.3779 | −0.2371 | [−0.3095, −0.1735] |
| Nemotron Nano | 0 | 0.7161 | 0.5616 | −0.1545 | [−0.2230, −0.0935] |
| Nemotron Super | 0 | 0.4718 | 0.3763 | −0.0956 | [−0.1280, −0.0635] |

Drafting lowered average benchmark loss for both models at both temperatures,
but increased average loss against Tit-for-Tat. Lowering temperature improved
Super Direct while Super Draft was nearly unchanged. Super's drafting advantage
therefore narrowed: the matched change in Draft-minus-Direct was +0.1415
(approximate 95% interval [+0.0840, +0.2066]). Nano's change was +0.0402
[−0.0256, +0.1142], uncertain under this interval.

These intervals resample matched whole blocks within four presentation strata,
with 20,000 bootstrap draws. Only six blocks per stratum are available; coverage
and power are not established. This post-viewing sensitivity analysis has no
multiplicity correction. Different execution dates, backend windows and recovery
policies also differed, so changes cannot be attributed solely to temperature.
Temperature zero does not guarantee deterministic hosted inference.

In autonomous play, mutual cooperation occurred in 189/2,060 rounds (9.2%) at
temperature 1 and 244/2,060 (11.8%) at 0. Dependent rounds are not independent
trials. These findings describe the tested schedules and procedures, rather than
a general model ranking or a universal preferred temperature.

## Try the recordings

1. [Open Study replay]({{ '/dilemma-dynamics/' | relative_url }}). The starting example is
   Nano Direct against Tit-for-Tat, with ten announced rounds in block 1 at temperature 0. Use the temperature selector to load the
   matched temperature-1 study. The starting condition was
   chosen by study metadata rather than its outcome.
2. Reveal a round and inspect both choices and their payoffs. Compare the matched
   Direct and Draft procedures, or choose another condition, pairing, or block.
3. [Open Results]({{ '/dilemma-dynamics/#results' | relative_url }}) to inspect
   both temperatures, matched changes, all ten autonomous pairings and recorded usage estimates.

The replay contains published actions, not reconstructed private drafts or
beliefs. One recording illustrates play; it cannot estimate a procedure's effect.

## Scope and reproducibility

Both completed studies followed inspection of interrupted predecessor outcomes.
The temperature-1 predecessor stopped after 339 episodes on HTTP 502. The first
temperature-0 attempt stopped after 62 completed episodes on HTTP 529; a separately
identified full recovery then completed the matched schedule. Interrupted and
engineering observations are excluded. The findings remain **descriptive**,
not a fresh confirmatory preregistration. Neither successful final run needed
retries or recorded protocol failures.

Each completed final run used 17,124 successful requests. Usage-priced final
inference estimates were $4.9278 at temperature 1 and $4.4791 at 0, excluding
engineering and failed predecessors. These are estimates, not provider invoices
or benchmark-only cost-effectiveness measurements. Viewing this site is free
and sends no inference requests.

The public package supports reproduction of scores and estimates from revealed
actions. It cannot independently authenticate provider identity, raw request
history, or billing. The report explains the design, amendments, uncertainty,
and limitations.

- [Read the report (PDF)]({{ '/dilemma-dynamics/research/paper/report.pdf' | relative_url }})
- [Read the methods and amendments]({{ '/dilemma-dynamics/research/protocol.md' | relative_url }})
- [Download temperature-1 episode actions (JSON)]({{ '/dilemma-dynamics/research/episodes.json' | relative_url }})
- [Download temperature-0 episode actions (JSON)]({{ '/dilemma-dynamics/research/temperature-zero/episodes.json' | relative_url }})
- [Download matched temperature changes (CSV)]({{ '/dilemma-dynamics/research/temperature-comparison.csv' | relative_url }})
- [Browse the public data and reproduction notes]({{ '/dilemma-dynamics/research/README.md' | relative_url }})

[Explore Dilemma Dynamics →]({{ '/dilemma-dynamics/' | relative_url }})
