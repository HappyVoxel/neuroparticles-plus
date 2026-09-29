# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browser-only artificial life sim with three species (Red, Green, Blue) in a rock-paper-scissors
predator/prey loop. Each dot is an agent with its own small neural net that looks at a round view of
121 cells around itself and picks a move. A genetic algorithm breeds
mature dots that stand near each other.
TypeScript + Vite + React 19 + shadcn/ui (Radix) + Tailwind CSS v4.

## Commands

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Vite dev server with live reload             |
| `npm run build`     | `tsc --noEmit`, then static build to `dist/` |
| `npm run preview`   | Serve `dist/` locally                        |
| `npm test`          | Vitest, once                                 |
| `npm run typecheck` | `tsc --noEmit`                               |
| `npm run lint`      | Biome lint on `src/`                         |
| `npm run format`    | Prettier (tabs, width 100) on the whole repo |

The build uses relative asset paths (`base: "./"`), so `dist/` can be hosted from any subfolder.
ES modules don't load from `file://`; always go through `dev` or `preview`.

## Layout

- `src/sim/` — the simulation, framework-free plain TypeScript (no React imports):
  - `config.ts` — every tunable constant and the species list (`speciesDefs`: id, name, shades).
  - `types.ts` — `Agent`, `Species`, `Genome`, `Field`, `MutationParams`, `Sim`.
  - `network.ts` — genome layout offsets, `randomGenome`, `evaluate` (forward pass), `pickMove`.
  - `movement.ts` — `Move` (0–16), `stepMoves`, `bounce`, `hitsWall`, `moveBy`, `moveCount`, `slide`.
  - `color.ts` — `shadeAt` (age → shade), `hpOpacity`, `oklchCss`.
  - `field.ts` — `buildField`, `senseAt` (the network input).
  - `evolution.ts` — `spawn`, `isNear`, `ageAndCull`, `crossover`, `mutate`, `litterSize`, `breed`.
  - `simulation.ts` — `createSim`, `step`, `moveAgent`, `recreate`, `extinctSpecies`; pure, return
    new values.
  - `render.ts` — canvas drawing.
  - `*.test.ts` — Vitest unit tests next to each module.
- `src/hooks/use-simulation.ts` — owns the sim in a ref and runs one `requestAnimationFrame` loop:
  each frame runs the steps that are due at the chosen speed, draws the canvas once and pushes a
  stats snapshot to React.
- `src/hooks/use-theme.ts` — light/dark, from `localStorage` key `theme` or the system setting.
  `index.html` has an inline script that applies the same key before first paint.
- `src/components/` — app components: `sim-canvas`, `run-controls`, `food-cycle`, `species-stats`,
  `wall-controls`, `mutation-controls`, `info-popover`, `theme-toggle`. `src/App.tsx` lays them out; `src/main.tsx` mounts it.
- `src/components/ui/` — vendored shadcn/ui components. Add with `npx shadcn@latest add <name>`;
  don't hand-edit them. Biome and Prettier skip this folder.
- `src/style.css` — Tailwind + shadcn theme tokens (preset `b1oVxsfY`: radix-sera, neutral, Inter,
  lucide).

## Conventions

- All UI uses shadcn/ui components (Button, Slider, Input, Label, Tooltip, AlertDialog, Alert,
  Progress, Separator, Badge, Popover); no hand-styled native form controls.
- On desktop (`lg`, windows 800px tall and up) the page fills the window exactly, with `p-4` on every
  side and no scroll: the canvas side is `100svh - 9.5rem` (capped by width), and the sidebar stretches
  to the canvas height. The `9.5rem`/`25rem` constants in `App.tsx` add up the padding, header, gaps and
  sidebar width; change them together with those classes and re-measure the gaps in the browser.
- Explanations of a sidebar section sit behind `InfoPopover` at the end of its title, not as text
  under the controls, so the sidebar stays short.
- The only colors beyond the neutral theme are the species colors, used for data, never for text.
- Simulation functions don't mutate their inputs; `step` and `recreate` return a new `Sim`, and the
  hook reassigns its ref. Hot loops (`evaluate`, `senseAt`, `draw`) use plain indexed loops.
- Constants live in `sim/config.ts`; nothing else hardcodes a size or rate.
- `tsconfig` is `strict` without `noUncheckedIndexedAccess`, so grid and genome indexing stays readable.
- Browser checks use the Playwright MCP (Firefox) against `npm run build && npm run preview`.
- Work and commit directly on `master`; this repo has no `sang-dev` branch.

## Core data model

- **Agent:** `{ genome, hp, x, y, prevX, prevY, lifetime }`. Genome and position live on the same
  object; `prevX`/`prevY` is the cell before the last move, used only for drawing.
- **Field:** `field[x][y]` is an `Int8Array` count of one species' agents per cell, rebuilt every step.
- **Grid:** 200×200 with walls; every move goes through `bounce`, which reflects a step past a wall
  back inside (E at the east wall lands one cell W, a 2-cell jump lands two cells W; only the axis
  that hits the wall reflects).
- **Genome:** flat `number[]` of length `genomeSize` (9525):
  - `[0, hiddenWeightsFrom)` — input→hidden weights, index `j * inputSize + k`
  - `[hiddenWeightsFrom, biasFrom)` — hidden→output weights, index `hiddenWeightsFrom + j * hiddenSize + k`
  - `[biasFrom, genomeSize)` — hidden biases
- **Network:** 363 inputs → 25 sigmoid hidden → 17 linear outputs. Output index is the move.
  Steps to a neighbor: `0 NW, 1 N, 2 NE, 3 W, 4 stay, 5 E, 6 SW, 7 S, 8 SE`. Knight jumps
  (±1,±2)/(±2,±1) to the in-between directions: `9 NNW, 10 NNE, 11 WNW, 12 ENE, 13 WSW, 14 ESE`,
  `15 SSW, 16 SSE`. `stayBias` is added to "stay" before argmax, taken over the first
  `moveCount(lifetime)` outputs only.
- **View:** `visionCells`, every cell with dx² + dy² ≤ `visionRadiusSquared` (37): 121 cells in a
  circle, 6 cells straight out and 4 along a diagonal.
- **Input:** the view row by row, with species counts interleaved per cell `[R,G,B, R,G,B, ...]`.
  Cells outside the grid read `wallSense` (−1) on the first channel and 0 on the other two.

## Step loop (`simulation.step`)

For each species: `ageAndCull` → `breed` → every agent `evaluate`s and moves → `buildField`.
All of it reads the fields from the previous step, so moves within a step don't see each other.

## Playback (`use-simulation.ts`, `render.ts`)

- Speed is steps per second, set by the Speed slider (`minStepsPerSecond`–`maxStepsPerSecond`).
- Steps in one frame stop after `stepBudgetMs`; steps still owed are dropped, so a slow machine slows
  the sim and keeps the frame rate.
- Up to `maxSlidingStepsPerSecond`, `draw` slides each dot from its previous cell to its current one
  (`slide` in `movement.ts`); above it, dots are drawn at their cell.
- `draw` paints each dot in its species' Tailwind shades 300 → 700 by age (lightest at birth,
  darkest for the species' oldest living dot) and at HP ÷ `startHp` opacity (capped at 100%). It
  blends additively, so overlapping dots show as brighter, whiter spots. The sidebar uses shade 500.

## Rules that are easy to miss

- For species `i`, enemies are `species[(i-1) mod 3]` and prey is `species[(i+1) mod 3]`
  (Red eats Green, Green eats Blue, Blue eats Red).
- HP per step: −`hpPenaltyFromSelfOrEnemy` if the cell has another of your kind or any enemy, +`hpRewardFromPrey` if it has prey, −`baseDecayPerStep` always. Dead at `hp <= 0`.
- A move into a wall costs `sim.wallPenalty` HP (`moveAgent` in `simulation.ts`); standing next to a
  wall or walking along it is free. The value starts at `hpPenaltyFromWall` and comes live from the
  Walls control (0 to `maxWallPenalty`). This is what makes evolution select against wall bumps.
- Breeding runs only when a species drops below `populationSize - 1`, and only fills the gap. Two
  agents can breed when both have lived `matureAge` steps and each is inside the other's view
  (`isNear`). Mature agents pair up in random order; an agent breeds once per step. No mature pair
  in view means no children.
- A pair gets a litter sized by `litterOdds`: 2 children 90% of the time, 1 child 9%, 3 children 1%
  (`litterSize`), cut to the slots still open. Children start with full HP. The first lands on the
  cell halfway between the parents, the second one cell E, the third one cell S (`siblingMoves`),
  so siblings don't pay the crowding penalty. Twins get the two halves of one `crossover`; a third
  child gets its own.
- Speed depends on age (`moveCount`): agents younger than `matureAge` or at least `oldAge`
  (0.8 × `startHp` ÷ `baseDecayPerStep`, the last 20% of a life without food) pick only from the
  one-cell moves 0–8 (`stepMoves`); adults in between can also knight-jump. The net still scores
  all 17 moves.
- Mutation: with `percent`% odds a child gets exactly `genes` random genes replaced by values in
  `[-2, 2)`. Both values come live from the Mutation controls.
- Recreate gives every living agent a new random genome and keeps position, HP and lifetime.
- Reset (`reset` in the hook) builds a new sim at step 0 with fresh random dots and pauses; it keeps
  the Walls, Mutation and Speed settings.
- A species that dies out stays extinct (`breed` returns nothing for zero survivors). The hook stops
  the frame loop once `extinctSpecies` is non-empty; the page shows an Alert and disables Run, Step
  and Randomize. Reset stays enabled and starts a new run.
