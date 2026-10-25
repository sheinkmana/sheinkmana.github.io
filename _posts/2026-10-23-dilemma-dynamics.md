---
layout: post
title: "Dilemma Dynamics: decision quality and the dynamics of cooperation"
date: 2026-10-23
last_modified_at: 2026-10-25
author: Alisa Sheinkman
description: "A 7,104-episode Nemotron evaluation: drafting improves average payoff decisions, while opponent responses reveal a different story for reciprocity and cooperation."
tags: game-theory llm nemotron
categories: research
permalink: /blog/2026/dilemma-dynamics/
related_posts: false
---

*Exploring AI strategies, incentives and cooperation.  An interactive game laboratory studying NVIDIA Nemotron's choices. Submission to [Nebius x NVIDIA Global AI Hackathon (Best Apps and Agents Track)](https://nebiusglobalaihackathon.devpost.com)*

AI agents may interact repeatedly with people or other agents while pursuing
their own objectives. Their choices can influence whether others cooperate,
retaliate or rebuild a productive relationship. Understanding how individual
decision quality relates to cooperation can help researchers and developers
evaluate agents that interact over time.

Repeated Prisoner's Dilemma makes this relationship concrete: immediate rewards
compete with future consequences. Dilemma Dynamics combines exact payoff
comparisons against disclosed opponent policies with autonomous interactions to
examine how drafting changes decisions and how cooperation develops, breaks down
and recovers.

Researchers and agent developers can inspect responses to incentives; students
can explore the same ideas through play, recordings and mathematical explanations.

In **7,104 repeated-game episodes** with NVIDIA Nemotron Nano and Super, a short
private draft reduced average benchmark decision loss by **16.8–37.5%** across
two models and two temperatures. The same procedure increased loss against
Tit-for-Tat and produced **less cooperation** in autonomous self-play.

**Nebius Token Factory** hosted NVIDIA Nemotron Nano and Super for the evaluation.
The website offers free browser play, saved games and replay exports without
model requests. Live Nemotron play uses Token Factory through the
[locally launched app](https://github.com/sheinkmana/dilemma-dynamics#run-locally),
with a key held by the localhost server and calls explicitly started on your account.

<p class="mb-4">
  <a class="btn btn-primary btn-lg" href="{{ '/dilemma-dynamics/#play' | relative_url }}">Play &amp; understand →</a>
  <a class="btn btn-outline-primary" href="{{ '/dilemma-dynamics/#results' | relative_url }}">Explore the results →</a>
</p>

**Try this route:** play a round, inspect its payoff analysis, watch a labelled
saved Nemotron interaction, then explore **Results**. Expand **Study replay** to
connect the charts to individual choices.

## A game where another encounter matters

In the repeated Prisoner's Dilemma, both players choose privately and reveal
together. Mutual cooperation earns **three points each**; mutual defection earns
one each. Defecting against a cooperator earns five, leaving the cooperator zero.
Defection pays more immediately, but a responsive partner can make cooperation
valuable over time. Each player seeks their own cumulative points.

The evaluation compares two procedures. **Direct** makes one thinking-off action
request. **Draft** generates a thinking-on draft of up to 1,024 tokens, then makes
a separate thinking-off action request of up to 128 tokens using that draft.
Both run at **temperatures 0 and 1**, with matched schedules and top-p 1. The
comparison measures this complete two-stage procedure.

### What the models were told

**Every decision prompt explicitly included the full numerical payoff table.**
The system instruction stated:

> Maximise your own expected cumulative points until game-rule termination; the objective is not score difference.

The user message supplied the current round, both cumulative scores, the complete
revealed action/payoff history, and the two legal actions. The instructions gave
either the announced total and remaining rounds or the continuation probability
with no announced final round.

Benchmark players were told the opponent's complete deterministic rule;
autonomous players were told that the opponent policy was unspecified. Current
choices stayed private until joint reveal. The models had no tools or
communication and received no analytical best-response solution or analyst
feedback. Draft used the same game information and objective; only that decision's
private draft was added to its separate action request.

The 6,144 benchmark episodes use four disclosed opponent rules: Always
Cooperate, Always Defect, Tit-for-Tat and Grim. Exact dynamic programming finds
the best achievable expected own payoff for each choice. **Decision loss** is
the normalised payoff forgone by an action, allowing optimal play afterward.
A reduction in loss means fewer points given up.

## Drafting improves the average

<figure>
  <img src="{{ '/dilemma-dynamics/research/figures/primary-results.png' | relative_url }}" alt="Draft minus Direct benchmark decision loss is negative for Nano and Super at both temperatures; all four 98.75 percent intervals are below zero." style="width:100%;height:auto;" loading="lazy">
  <figcaption>Four planned comparisons, with 768 benchmark episodes per arm and temperature. Relative loss reductions are 16.8% for Nano at 0, 19.4% for Super at 0, 25.7% for Nano at 1 and 37.5% for Super at 1. Intervals resample matched whole blocks within four presentation strata; their 98.75% marginal level gives the planned approximate four-comparison family treatment.</figcaption>
</figure>

The effect depends on the partner. Against Always Cooperate, better own-payoff
decisions mean exploiting an unresponsive cooperator. Against Grim, today's
defection can destroy future gains. Against Tit-for-Tat, the optimal pattern
changes with the chance of another round: some conditions reward alternation,
others sustained cooperation.

**Tit-for-Tat reverses the average finding in all four model/temperature
comparisons.** Draft raises its mean decision loss by **0.1717–0.3225 normalised
payoff points**, while lowering all four means against Always Cooperate and Grim.
The condition chart shows why the opponent response and horizon belong in the
explanation of a model's score.

<figure>
  <img src="{{ '/dilemma-dynamics/research/figures/condition-effects.png' | relative_url }}" alt="Exploratory condition-level drafting effects across the four opponent policies, both temperatures and different horizons, showing gains and reversals." style="width:100%;height:auto;" loading="lazy">
  <figcaption>Exploratory condition effects. Each cell compares 48 episodes per arm. Blue favours Draft; red favours Direct. The 16 conditions combine continuation probabilities and announced horizons.</figcaption>
</figure>

## Cooperation also depends on repair

Another **960 autonomous dyads** cover all ten model/procedure pairings,
including self-play. Each pairing has 48 episodes per temperature. Changing both
self-play agents from Direct to Draft lowers mutual-cooperation and joint-return
point estimates for each model at each temperature.

<figure>
  <img src="{{ '/dilemma-dynamics/research/figures/autonomous-self-play.png' | relative_url }}" alt="Mean within-episode mutual cooperation is lower under Draft than Direct for both models at both temperatures." style="width:100%;height:auto;" loading="lazy">
  <figcaption>Episode-weighted mutual cooperation: each episode contributes its own fraction of mutually cooperative rounds with equal weight. Self-play comparisons are exploratory and change both players together.</figcaption>
</figure>

Super at temperature zero illustrates the role of recovery. Direct self-play
starts with no mutually cooperative first rounds, then returns to cooperation
in **82 of 218 eligible transitions**. Draft has no observed return to mutual
cooperation in **325 opportunities**. Direct accumulates **124/376 cooperative
rounds**, compared with **3/376** under Draft. 

## What these patterns show

The results connect three questions that are useful to study separately: Can an
agent identify the best action against a known policy? Can it plan through that
policy's future responses? Can two adaptive agents establish and/or repair a
productive relationship?

Future work could try changing models' context/task framing to emphasise cooperation and long-term planning and/or hiding the opponent's strategy.
Further, one can study how longer and changing interactions affect memory, context use and incentives;
I would also be interested in paying more attention to the Chain-of-Thought reasoning and explanations.
Adding messages or noisy actions would show how agents interpret mistakes, commitments and
intent. Broader games and populations would test how these capabilities transfer
across changing social environments.

## Evidence and methods

- [Read the study and mathematical notes (PDF)]({{ '/dilemma-dynamics/research/paper/report.pdf' | relative_url }})
- [Browse the repository and reproduction instructions](https://github.com/sheinkmana/dilemma-dynamics)

## Explore the app

Start with [Play & understand]({{ '/dilemma-dynamics/#play' | relative_url }}) to
learn the rules, play yourself, watch bots or watch labelled Nemotron recordings.
Completed rounds include payoff analysis. [Results]({{ '/dilemma-dynamics/#results' | relative_url }})
leads with charts and key numbers, followed by optional Study replay and detailed
tables. The initial recording is selected by fixed metadata, independently of its
outcome.

**Bonus!** [Recreational games]({{ '/dilemma-dynamics/#recreational' | relative_url }}) offers Tic-tac-toe and Dots & Boxes. They are mathematical games on discrete grids, with perfect information and visible sequential moves with nothing to hide.

**Bonus 2!** [Link to the talk by Michael I. Jordan after which I decided to carefully read a book on game theory](https://youtu.be/mnniZJuMURk?si=lch3CoU181ZdJuzw&t=1817).
