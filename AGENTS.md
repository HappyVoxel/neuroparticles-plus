# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browser-only artificial life sim with three species (Red, Green, Blue) in a rock-paper-scissors
predator/prey loop. Each dot is an agent with its own small neural net that looks at a round view of
121 cells around itself and picks a move. A genetic algorithm breeds the best hunters of all
species into one shared population. Read `docs/architecture.md` before changing how dots behave.
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

The build uses relative asset paths (`base: "./"`); ES modules don't load from `file://`, so go through `dev` or `preview`.
Every push to `master` deploys to npp.happyvoxel.com (Docker, Woodpecker, Easypanel): see `docs/deployment.md`.

## Layout

- `src/sim/` — the simulation, framework-free plain TypeScript (no React imports):
  - `config.ts` — every tunable constant and the species list (`speciesDefs`: id, name, shades).
  - `types.ts` — `Agent`, `DeadAgent`, `HallOfFame`, `Species`, `Genome`, `Cell`, `Field`, `MutationParams`,
    `Disease`, `Sim`.
  - `network.ts` — genome layout offsets, `randomGenome`, `evaluate` (forward pass), `pickMove`.
  - `movement.ts` — `Move` (0–16), `stepMoves`, `bounce`, `hitsWall`, `moveBy`, `moveCount`, `slide`.
  - `color.ts` — `shadeAt` (age → shade), `hpOpacity`, `oklchCss`.
  - `field.ts` — `buildField`, `senseAt` (the network input).
  - `area.ts` — `Area` (a box of cells), `areaFromCorners`, `agentsIn`. `math.ts` — `clamp`.
  - `capture.ts` — `preyOf` (who eats whom), `capture` (who gets caught this step and how much HP each
    hunter takes).
  - `disease.ts` — `emptyDisease`, `spreadDisease` (one step of disease), `diseaseCostAt`, `circleCounts`.
  - `evolution.ts` — `spawn`, `isNear`, `ageAndCull`, `crossover`, `mutate`, `litterSize`, `breed`.
  - `records.ts` — `addToHallOfFame`, `findDot`, `topDots`, `leaderIds`, `nearestDot`, `isDead`.
  - `simulation.ts` — `createSim`, `step`, `moveAgent`, `recreate`, `extinctSpecies` (all pure).
  - `render.ts` — canvas drawing. `host.ts` — the worker's side (`createHost`, `simView`); `worker.ts` runs it.
  - `*.test.ts` — Vitest unit tests next to each module.
- `src/hooks/use-simulation.ts` — talks to the worker and runs one `requestAnimationFrame` loop:
  each frame shows the steps that are due, draws the canvas once and pushes a snapshot to React.
- `src/hooks/use-loupe.ts` — Z toggles the canvas loupe, Esc turns it off.
- `src/hooks/use-shortcut.ts` — `useShortcut(key, onPress, enabled)`, the one way to add a key shortcut.
- `src/hooks/use-theme.ts` — light/dark, from `localStorage` key `theme` or the system setting.
  `index.html` has an inline script that applies the same key before first paint.
- `src/hooks/use-sound.ts` + `src/lib/sound.ts` — Web Audio effects and shuffled music loops under one
  master volume; `localStorage` keys `music` (off by default), `sound-effects` (on) and `volume` (0–1,
  squared into gain). `src/assets/` holds Opus/WebM files made by `scripts/encode-audio.sh`; re-run
  it to change a sound, never hand-convert.
- `src/lib/species.ts` — `speciesDisplay`, each species' name and shade-500 color by index; the UI reads them here.
- `src/components/` — app components: `sim-canvas`, `area-inspector`, `run-controls`, `food-cycle`, `species-stats`, `species-swatch`,
  `wall-controls`, `mutation-controls`, `dot-record`, `top-dots`, `top-dots-filter`, `canvas-loupe`, `disease-labels`, `info-popover`, `theme-toggle`, `sound-menu`, `sidebar-section` (title + `InfoPopover`), `canvas-popover` (the dot record's and area inspector's popover shell),
  `labeled-slider` (label, value and Slider; every sidebar slider uses it). `src/App.tsx` lays them out; `src/main.tsx` mounts it.
- `src/components/ui/` — vendored shadcn/ui components. Add with `npx shadcn@latest add <name>`;
  don't hand-edit them. Biome and Prettier skip this folder.
- `src/style.css` — Tailwind + shadcn theme tokens (preset `b1oVxsfY`: radix-sera, neutral, Inter,
  lucide). Offside (`font-display`) sets the app title and the disease labels on the canvas.

## Conventions

- All UI uses shadcn/ui components (Button, Slider, Input, Label, Tooltip, AlertDialog, Alert,
  Progress, Separator, Badge, Popover); no hand-styled native form controls.
- On desktop (`lg`, windows 800px tall and up) the page fills the window exactly, with `p-4` on every
  side and no scroll: the canvas side is `100svh - 9.5rem` (capped by width), and the sidebar stretches
  to the canvas height. The `9.5rem`/`25rem` constants in `App.tsx` add up the padding, header, gaps and
  sidebar width; change them together with those classes and re-measure the gaps in the browser.
- Explanations of a sidebar section sit behind `InfoPopover` at the end of its title, not as text
  under the controls, so the sidebar stays short.
- The only colors beyond the neutral theme are the species colors, used for data, disease areas,
  the oldest-dot glow, the top-hunter swords and the disease labels (both white-outlined), never
  for other text, and
  `yellow-400` for the inspected area's frame and the followed dot's ring.
- Global shortcuts: Space runs/pauses (`use-run-shortcut`) and S steps, both bound in `run-controls`
  beside their buttons; Z toggles the loupe and Esc turns it off (`use-loupe`). Every shortcut goes through `useShortcut`: it skips modifiers, held
  keys, fields and confirm dialogs (`isShortcut`), is off when its button would be disabled, and
  clicks. Space never presses a focused button.
- Buttons, menu items, shortcuts and sliders (per step while dragged, never on press or release,
  and per key step) click through document listeners in `use-sound`; `data-sound="pop"` (selects a dot) or
  `"none"` on a button changes that.
- Simulation functions don't mutate their inputs; `step` and `recreate` return a new `Sim`, and the
  host keeps the last few. Hot loops (`evaluate`, `senseAt`, `draw`) use plain indexed loops.
- Constants live in `sim/config.ts`; nothing else hardcodes a size or rate.
- `tsconfig` is `strict` without `noUncheckedIndexedAccess`, so grid and genome indexing stays readable.
- Browser checks use the Playwright MCP (Firefox) against `npm run build && npm run preview`.
- Work and commit directly on `master`; this repo has no `sang-dev` branch.
- Findings we chose to skip, with why and when to revisit, live in `docs/backlog.md`; read it
  before proposing a cleanup.

## Core data model

- **Agent:** `{ id, genome, hp, x, y, prevX, prevY, lifetime, kills, ... }`. The record of a dot lives
  on the agent itself: `id` (unique in a run, from `Sim.nextId`), `bornStep`, `parents`, `children`,
  move counts (`stays`, `steps`, `jumps`, `wallBumps`) and an HP ledger (`peakHp`, `hpEaten`,
  `hpLostCrowding`, `hpLostDisease`, `hpLostWall`). `prevX`/`prevY` is the cell before the last move,
  used only for drawing; `kills` counts the prey it caught and decides who breeds first.
- **Dead dots:** `ageAndCull` returns the dead as `DeadAgent` (`diedStep`, `cause`: caught by which
  species and hunter ids, or out of HP). Each species keeps the last step's dead in `lastDeaths` and
  the best `hallOfFameSize` dead per ranking (`rankings`: kills, lifetime, peakHp) in `hallOfFame`, genome included.
- **Field:** `field[x][y]` is an `Int8Array` count of one species' agents per cell, rebuilt every step.
- **Grid:** 200×200 with walls; every move goes through `bounce`, which reflects a step past a wall
  back inside (E at the east wall lands one cell W, a 2-cell jump lands two cells W; only the axis
  that hits the wall reflects).
- **Genome:** flat `number[]` of length `genomeSize` (12550):
  - `[0, hiddenWeightsFrom)` — input→hidden weights, index `j * inputSize + k`
  - `[hiddenWeightsFrom, biasFrom)` — hidden→output weights, index `hiddenWeightsFrom + j * hiddenSize + k`
  - `[biasFrom, genomeSize)` — hidden biases

  It holds nothing else: no memory, no traits, no species marker (`docs/architecture.md`).

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

`capture` runs once for all species, then `ageAndCull` per species, then one `breed` for all
species. Then every agent `evaluate`s and moves, each species runs `buildField`, and `spreadDisease`
reads the new fields. All of it reads the positions, fields and disease from the previous step, so
moves within a step don't see each other.

## Playback (`use-simulation.ts`, `render.ts`)

- Speed is steps per second, set by the Speed slider (`minStepsPerSecond`–`maxStepsPerSecond`).
- The sim runs in a worker. While running it keeps up to `stepsAhead` steps ready; with none ready a
  frame holds the dots on their cells, so a slow machine slows the sim, not the frames. Pause,
  Randomize and Reset bump an `epoch` that drops older frames; pause rewinds the worker to the canvas.
- Up to `maxSlidingStepsPerSecond`, `draw` slides each dot from its previous cell to its current one
  (`slide` in `movement.ts`); above it, dots are drawn at their cell.
- `draw` paints each dot in its species' shades 300 → 700 by age (darkest: the species' oldest),
  sized by `dotSizeAt` (40% of a cell at birth to 1 at `matureAge`), at `hpOpacity` (50–100%),
  blending additively. The sidebar uses shade 500.
- The canvas has one pixel per screen pixel (CSS size × `devicePixelRatio`, kept by a
  `ResizeObserver` in the hook); `draw` works in `cellPixels` per cell and `paint` scales it.

## Canvas and sidebar tools

Following a dot, the loupe, the top-dots board and its filter, the area inspector, the oldest-dot
glow, the top-hunter swords and the disease labels: see `docs/ui.md`.

## Rules that are easy to miss

- For species `i`, enemies are `species[(i-1) mod 3]` and prey is `species[(i+1) mod 3]`
  (Red eats Green, Green eats Blue, Blue eats Red).
- Capture (`capture.ts`): a dot sharing a cell with an enemy dies; the enemies there split its HP
  and each adds 1 to `kills`. All species resolve from the same positions. A hunter feeds
  `feedSharePercent` (50%) of its catch to its young children in view (`fed`, `hpFed`).
- HP per step: −`hpPenaltyFromCrowding` if the cell has another of your kind, −`decayAt` its age
  always: `baseDecayPerStep` while young, then times 1, 2, 3, 5, 8, … (Fibonacci), one stage per
  `decayStageSteps` (1,000). Dead at `hp <= 0`; no age limit, no HP cap, so an old dot lives only
  while it eats enough. A dot is born with `birthHp` (3,000) and gains HP only by eating or being
  fed; smaller births die out more (`docs/hunting-research.md`).
- Disease (`disease.ts`): a view-sized circle crowded by one species for more than
  `diseaseAfterSteps` steps becomes a `DiseaseArea` that drains HP from every dot inside and grows
  or shrinks with its own species' dots. Overlaps never stack. Full rule: `docs/architecture.md`.
- A move into a wall costs `sim.wallPenalty` HP (`moveAgent` in `simulation.ts`); standing next to a
  wall or walking along it is free. The value starts at `hpPenaltyFromWall` and comes live from the
  Walls control (0 to `maxWallPenalty`). This is what makes evolution select against wall bumps.
- All species share one budget of `totalPopulation` dots. Each keeps `minPopulation` slots of its
  own; the rest is a pool any species can fill, so the species that breeds first grows and the
  others shrink to their reserve. `breed` runs once for all species and only fills the gap; a
  species breeds only when it starts the step with 2 or more open slots. Agents that lived
  `matureAge` steps, of every species, pair up in order of `kills` ÷ `lifetime`, highest first,
  ties in random order. Each takes the best free mature agent of its species inside its view
  (`isNear`), or the best free one anywhere when none is in view, so a thinned-out species still
  breeds. A litter is cut to its species' open slots: its reserve room plus what is left of the
  pool. An agent breeds once per step. Breeding by kills is what stops dots from standing still;
  see `docs/hunting-research.md`. Reset splits the budget evenly.
- Litters (`litterOdds`: 2 children 90%, 1 child 9%, 3 children 1%) start with `birthHp`. Until
  `carryUntilAge` (20) a child rides beside its parent (`moveAll`, `carrySlot`), and a carrier
  doesn't breed. Placement, carrying and following: `docs/architecture.md`, "Children".
- Speed depends on age (`moveCount`): agents younger than `matureAge` or at least `oldAge` (8,000)
  pick only from the one-cell moves 0–8 (`stepMoves`); adults in between can also knight-jump. The
  net still scores all 17 moves.
- Mutation: with `percent`% odds a child gets exactly `genes` random genes replaced by values in
  `[-2, 2)`. Both values come live from the Mutation controls.
- Recreate gives every living agent a new random genome, a new id and zeroed counters, and keeps
  position, HP, lifetime and birth step: a new brain is a new dot.
- Reset (`reset` in the hook) builds a new sim at step 0 with fresh random dots and pauses; it keeps
  the Walls, Mutation and Speed settings. `sim-settings.ts` also keeps them in `localStorage` across
  a refresh; an invalid value falls back to its `config.ts` default, and a saved value hides a new one.
- A species that dies out stays extinct (`breed` returns nothing for zero survivors). The hook stops
  the frame loop once `extinctSpecies` is non-empty (`snap.extinct`); the page shows an Alert and
  disables Run, Step and Randomize. Reset stays enabled and starts a new run.
