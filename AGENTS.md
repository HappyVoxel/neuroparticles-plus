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
  - `types.ts` — `Agent`, `DeadAgent`, `HallOfFame`, `Species`, `Genome`, `Field`, `MutationParams`,
    `Disease`, `Sim`.
  - `network.ts` — genome layout offsets, `randomGenome`, `evaluate` (forward pass), `pickMove`.
  - `movement.ts` — `Move` (0–16), `stepMoves`, `bounce`, `hitsWall`, `moveBy`, `moveCount`, `slide`.
  - `color.ts` — `shadeAt` (age → shade), `hpOpacity`, `oklchCss`.
  - `field.ts` — `buildField`, `senseAt` (the network input).
  - `area.ts` — `Area` (a box of cells), `areaFromCorners`, `agentsIn`.
  - `capture.ts` — `preyOf` (who eats whom), `capture` (who gets caught this step and how much HP each
    hunter takes).
  - `disease.ts` — `emptyDisease`, `spreadDisease` (one step of disease), `diseaseCostAt`, `circleCounts`.
  - `evolution.ts` — `spawn`, `isNear`, `ageAndCull`, `crossover`, `mutate`, `litterSize`, `breed`.
  - `records.ts` — `addToHallOfFame`, `findDot`, `topDots`, `nearestDot`, `isDead`.
  - `simulation.ts` — `createSim`, `step`, `moveAgent`, `recreate`, `extinctSpecies`; pure, return
    new values.
  - `render.ts` — canvas drawing.
  - `*.test.ts` — Vitest unit tests next to each module.
- `src/hooks/use-simulation.ts` — owns the sim in a ref and runs one `requestAnimationFrame` loop:
  each frame runs the steps that are due at the chosen speed, draws the canvas once and pushes a
  stats snapshot to React.
- `src/hooks/use-loupe.ts` — Z toggles the canvas loupe, Esc turns it off.
- `src/hooks/use-theme.ts` — light/dark, from `localStorage` key `theme` or the system setting.
  `index.html` has an inline script that applies the same key before first paint.
- `src/hooks/use-sound.ts` + `src/lib/sound.ts` — Web Audio effects and shuffled music loops under one
  master volume; `localStorage` keys `music` (off by default), `sound-effects` (on) and `volume` (0–1,
  squared into gain). `src/assets/` holds Opus/WebM files made by `scripts/encode-audio.sh`; re-run
  it to change a sound, never hand-convert.
- `src/components/` — app components: `sim-canvas`, `area-inspector`, `run-controls`, `food-cycle`, `species-stats`,
  `wall-controls`, `mutation-controls`, `dot-record`, `top-dots`, `canvas-loupe`, `info-popover`, `theme-toggle`, `sound-menu`, `sidebar-section` (title + `InfoPopover`),
  `labeled-slider` (label, value and Slider; every sidebar slider uses it). `src/App.tsx` lays them out; `src/main.tsx` mounts it.
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
- The only colors beyond the neutral theme are the species colors, used for data and disease areas,
  never for text, and `yellow-400` for the inspected area's frame and the followed dot's ring.
- Global shortcuts: Space runs/pauses (`use-run-shortcut`), Z toggles the loupe (`use-loupe`). Both
  skip keys typed into fields (`isTyping` in `src/lib/keyboard.ts`); Space never presses a focused button.
- Buttons, menu items and sliders (on press and per key step) click through document listeners in
  `use-sound`; `data-sound="pop"` (selects a dot) or `"none"` on a button changes that.
- Simulation functions don't mutate their inputs; `step` and `recreate` return a new `Sim`, and the
  hook reassigns its ref. Hot loops (`evaluate`, `senseAt`, `draw`) use plain indexed loops.
- Constants live in `sim/config.ts`; nothing else hardcodes a size or rate.
- `tsconfig` is `strict` without `noUncheckedIndexedAccess`, so grid and genome indexing stays readable.
- Browser checks use the Playwright MCP (Firefox) against `npm run build && npm run preview`.
- Work and commit directly on `master`; this repo has no `sang-dev` branch.

## Core data model

- **Agent:** `{ id, genome, hp, x, y, prevX, prevY, lifetime, kills, ... }`. The record of a dot lives
  on the agent itself: `id` (unique in a run, from `Sim.nextId`), `bornStep`, `parents`, `children`,
  move counts (`stays`, `steps`, `jumps`, `wallBumps`) and an HP ledger (`hpEaten`,
  `hpLostCrowding`, `hpLostDisease`, `hpLostWall`). `prevX`/`prevY` is the cell before the last move,
  used only for drawing; `kills` counts the prey it caught and decides who breeds first.
- **Dead dots:** `ageAndCull` returns the dead as `DeadAgent` (`diedStep`, `cause`: caught by which
  species and hunter ids, or out of HP). Each species keeps the last step's dead in `lastDeaths` and
  the best `hallOfFameSize` dead per ranking (kills, lifetime) in `hallOfFame`, genome included.
- **Field:** `field[x][y]` is an `Int8Array` count of one species' agents per cell, rebuilt every step.
- **Grid:** 200×200 with walls; every move goes through `bounce`, which reflects a step past a wall
  back inside (E at the east wall lands one cell W, a 2-cell jump lands two cells W; only the axis
  that hits the wall reflects).
- **Genome:** flat `number[]` of length `genomeSize` (12550):
  - `[0, hiddenWeightsFrom)` — input→hidden weights, index `j * inputSize + k`
  - `[hiddenWeightsFrom, biasFrom)` — hidden→output weights, index `hiddenWeightsFrom + j * hiddenSize + k`
  - `[biasFrom, genomeSize)` — hidden biases
- **Network:** 484 inputs → 25 sigmoid hidden → 17 linear outputs. Output index is the move.
  Steps to a neighbor: `0 NW, 1 N, 2 NE, 3 W, 4 stay, 5 E, 6 SW, 7 S, 8 SE`. Knight jumps
  (±1,±2)/(±2,±1) to the in-between directions: `9 NNW, 10 NNE, 11 WNW, 12 ENE, 13 WSW, 14 ESE`,
  `15 SSW, 16 SSE`. `stayBias` is added to "stay" before argmax, taken over the first
  `moveCount(lifetime)` outputs only.
- **View:** `visionCells`, every cell with dx² + dy² ≤ `visionRadiusSquared` (37): 121 cells in a
  circle, 6 cells straight out and 4 along a diagonal.
- **Input:** the view row by row, 4 channels per cell `[R,G,B,D, R,G,B,D, ...]`: species counts, then
  the cell's disease cost ÷ `diseaseHpAtCenter` (0 outside disease, 1 at an area's center).
  Cells outside the grid read `wallSense` (−1) on the first channel and 0 on the other three.

## Step loop (`simulation.step`)

`capture` runs once for all species. Then for each species: `ageAndCull` → `breed` → every agent
`evaluate`s and moves → `buildField`. Then `spreadDisease` reads the new fields. All of it reads the
positions, fields and disease from the previous step, so moves within a step don't see each other.

## Playback (`use-simulation.ts`, `render.ts`)

- Speed is steps per second, set by the Speed slider (`minStepsPerSecond`–`maxStepsPerSecond`).
- Steps in one frame stop after `stepBudgetMs`; steps still owed are dropped, so a slow machine slows
  the sim and keeps the frame rate.
- Up to `maxSlidingStepsPerSecond`, `draw` slides each dot from its previous cell to its current one
  (`slide` in `movement.ts`); above it, dots are drawn at their cell.
- `draw` paints each dot in its species' Tailwind shades 300 → 700 by age (lightest at birth,
  darkest for the species' oldest living dot) and at HP ÷ `startHp` opacity (capped at 100%). It
  blends additively, so overlapping dots show as brighter, whiter spots. The sidebar uses shade 500.

## Following a dot (`dot-record.tsx`, `top-dots.tsx`, `canvas-loupe.tsx`)

- A click on the canvas without a drag follows the nearest living dot within `pickCells` (3); with the
  loupe on (Z, a `loupeZoom`× circle at the pointer) within `loupePickCells` (1). A click on empty
  ground stops following. The top-dots list in the sidebar follows a dot by id, dead ones included.
- The hook keeps the followed record after every step (`findDot`), so its popover shows the death
  and stays until closed. Snapshots carry records without genomes; "Copy genome" reads it from the
  hook. Randomize and Reset stop following.

## Area inspector (`area-inspector.tsx`)

- A layer over the canvas turns a drag into an `Area` and passes it to `inspect` in the hook. Every
  snapshot then carries `areaSpecies`: the same `SpeciesStats` as the sidebar, for the dots inside it,
  so the popover beside the frame updates live.
- Only a click on the canvas, the X button or Esc closes it; clicks in the sidebar keep it open so
  Run and Step work while it's up. A confirmed Reset clears it.

## Rules that are easy to miss

- For species `i`, enemies are `species[(i-1) mod 3]` and prey is `species[(i+1) mod 3]`
  (Red eats Green, Green eats Blue, Blue eats Red).
- Capture (`capture.ts`): a dot that shares a cell with an enemy dies. The enemies on that cell split
  its HP equally, each capped at `startHp`, and each adds 1 to its `kills`. All species resolve from
  the same positions, so a dot caught this step still catches.
- HP per step: −`hpPenaltyFromCrowding` if the cell has another of your kind, −`baseDecayPerStep`
  always. Dead at `hp <= 0`.
- Disease (`disease.ts`): the circle of view size around a cell counts a crowded step while it holds
  more than `diseaseCrowd` dots of one species outside disease, and resets otherwise. Past
  `diseaseAfterSteps` in a row it becomes a `DiseaseArea` of that species, born at view size. Dots
  inside an area and cells inside one never count a crowd, so areas don't pile up. Each step an
  area's `radius` moves at most one cell toward `targetRadius` of its own species' dots inside (the
  size that keeps its birth density), between `diseaseMinRadius` and `diseaseMaxRadius`: it grows as
  its dots walk in and shrinks as they leave or die. Every dot inside, of any species, loses
  `diseaseHpAtCenter` HP per step on the center, falling linearly to `diseaseHpAtEdge` at the
  area's own edge. Overlaps never stack: a cell costs its worst area. An area clears after more than
  `diseaseAfterSteps` steps with no dot inside. `draw` fills each area in its species' 300 shade at
  `diseaseOpacity`, one shape per species, under the dots.
- A move into a wall costs `sim.wallPenalty` HP (`moveAgent` in `simulation.ts`); standing next to a
  wall or walking along it is free. The value starts at `hpPenaltyFromWall` and comes live from the
  Walls control (0 to `maxWallPenalty`). This is what makes evolution select against wall bumps.
- Breeding runs only when a species drops below `populationSize - 1`, and only fills the gap. Agents
  that lived `matureAge` steps pair up in order of `kills` ÷ `lifetime`, highest first, ties in
  random order. Each takes the best free mature agent inside its view (`isNear`), or the best free
  one anywhere when none is in view, so a thinned-out species still breeds. An agent breeds once per
  step. Breeding by kills is what stops dots from standing still; see `docs/hunting-research.md`.
- A pair gets a litter sized by `litterOdds`: 2 children 90% of the time, 1 child 9%, 3 children 1%
  (`litterSize`), cut to the slots still open. Children start with full HP. The first lands on the
  cell halfway between the parents, the second one cell E, the third one cell S (`siblingMoves`),
  so siblings don't pay the crowding penalty. Children of a pair out of each other's view land E, S
  and W of the first parent (`besideMoves`). Twins get the two halves of one `crossover`; a third
  child gets its own.
- Speed depends on age (`moveCount`): agents younger than `matureAge` or at least `oldAge`
  (0.8 × `startHp` ÷ `baseDecayPerStep`, the last 20% of a life without food) pick only from the
  one-cell moves 0–8 (`stepMoves`); adults in between can also knight-jump. The net still scores
  all 17 moves.
- Mutation: with `percent`% odds a child gets exactly `genes` random genes replaced by values in
  `[-2, 2)`. Both values come live from the Mutation controls.
- Recreate gives every living agent a new random genome, a new id and zeroed counters, and keeps
  position, HP, lifetime and birth step: a new brain is a new dot.
- Reset (`reset` in the hook) builds a new sim at step 0 with fresh random dots and pauses; it keeps
  the Walls, Mutation and Speed settings. `sim-settings.ts` also keeps them in `localStorage` across
  a refresh; an invalid value falls back to its `config.ts` default, and a saved value hides a new one.
- A species that dies out stays extinct (`breed` returns nothing for zero survivors). The hook stops
  the frame loop once `extinctSpecies` is non-empty; the page shows an Alert and disables Run, Step
  and Randomize. Reset stays enabled and starts a new run.
