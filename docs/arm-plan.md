# Arm, holds and escape boost

Plan from 2026-10-03. Goal: dots catch by reaching with an arm the network aims, a catch takes a
3-step hold the prey can escape, and group hunts beat lone ones. Research first (phase 1); the app
gets it only if the research holds up (phase 2).

**Status:** phase 1 failed the go rule with both sensors: no run learned to aim
(`docs/hunting-research.md`, "Arm and holds"). Phase 2 is not built.

## Rules

- **Arm.** Each step the network picks one of 9 arm outputs: the 8 neighbor cells or none, separate
  from the move. A dot moves and reaches in the same step; the arm reaches from the cell it moved
  to. Reaching is free; reaching into a wall does nothing. The genome grows by 25 × 9 = 225
  weights (12,550 → 12,775).
- **Connected.** A hunter is connected to a prey when it stands on the prey's cell or its arm
  reaches into it. Sharing a cell no longer kills on the spot: every catch is a hold.
- **Hold.** The first step a hunter connects starts a hold. The prey and every connected hunter
  are pinned (their move is ignored); their arms still work. An arm hunter must keep reaching into
  the prey's cell each step or it lets go. When every hunter lets go or dies, the hold breaks and
  the prey is free. A hunter holds one prey at a time; a dot can be holding and held at once.
- **Escape roll.** At the end of step `holdSteps` (3) the prey escapes with `soloEscapePercent`
  (80) minus `escapeDropPerHunter` (20) points per extra connected hunter: 1 → 80%, 2 → 60%,
  3 → 40%, 4 → 20%, 5+ → 0%. Late joiners count. On a kill the hunters connected at that moment
  split the prey's HP and each adds 1 to `kills`. An escape gives the
  hunters nothing.
- **Escape boost.** A prey that wins the roll gets `escapeBoostSteps` (60) steps of 1.5× speed:
  every second step it thinks again from its new cell (same previous-step view) and moves twice.
  Each move keeps the age rule (`moveCount`) and the wall cost. A hold broken by letting go gives
  no boost.

## Phase 1: headless research (`.exp/`, git-ignored)

1. Re-sync `.exp/hunt/` with today's `src/sim/` (shared budget, lifespan) and put the rules above
   behind `arm: true` in `options.ts`.
2. Measures: aim (with prey on a neighbor cell, the share of arms that reach into prey; random is
   about 1 in 9), holds started, let go, escaped and killed, hunters per kill, escaped dots caught
   again within their boost, plus stay, chase, toward, kills per 1,000 dot-steps, died out and
   lowest species count.
3. Runs, 30,000 steps × 4 each: today's rules; arm + hold + boost; arm + hold without the roll.
4. Results go in an "Arm" section of `docs/hunting-research.md`.

Go when aim is clearly above 1 in 9, kills are not near zero, and no more runs die out than under
today's rules.

## Phase 2: the app

| File            | Change                                                          |
| --------------- | --------------------------------------------------------------- |
| `config.ts`     | `armOutputs`, `holdSteps`, escape and boost constants           |
| `types.ts`      | `Agent.reach`, hold state, `boostedUntil`                       |
| `network.ts`    | `pickReach` over the arm outputs                                |
| `capture.ts`    | Start, keep, break and roll holds; returns caught and gain      |
| `simulation.ts` | `think` sets `reach`; pinned dots stay; boosted dots move twice |
| `host.ts`       | `AgentView` carries `reach`, hold and boost                     |
| `render.ts`     | Followed-dot overlay                                            |

The overlay draws, for the followed dot only: its view circle, the prey and enemy cells it sees,
its last move, its arm, a line to every dot in a hold with it with the hold's step, and its boost.
Tests cover hold start, letting go, the roll per hunter count, pinning and the boost's move
pattern. `AGENTS.md`, `docs/architecture.md` and `docs/ui.md` get the new rules.

## Counter-arguments

- Kills drop hard: a lone hunter wins 20% of 3-step holds and a boosted escapee runs off. If kill
  rates sit near zero, breeding order turns random again, the setup where dots stood still. Tune a
  number first (solo escape 60%, boost 20 steps), not the design.
- A random arm already doubles the catch zone (own cell plus one neighbor), so more kills alone
  don't prove aim; the aim measure does.
- The network doesn't know it is holding. If aim stays at random, a "holding" input is the next
  lever.
- A pinned hunter is open to its own enemy. Good tradeoff, but it pushes toward extinction; watch
  the lowest species count.
- The arm is offense only; prey gain nothing from it beyond the escape roll and boost.
