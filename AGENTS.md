# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browser-only artificial life sim with three species (Red, Green, Blue) in a rock-paper-scissors
predator/prey loop. Each dot is an agent with its own small neural net that looks at an 11×11 window
around itself and picks a move. A genetic algorithm breeds the longest-lived survivors.
TypeScript + Vite + Tailwind CSS v4, no runtime dependencies.

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

- `index.html` — markup with Tailwind classes; buttons are wired in `main.ts`, not inline handlers.
- `src/sim/config.ts` — every tunable constant and the species list (`speciesDefs`).
- `src/sim/types.ts` — `Agent`, `Species`, `Genome`, `Field`, `MutationParams`, `Sim`.
- `src/sim/network.ts` — genome layout offsets, `randomGenome`, `evaluate` (forward pass), `pickMove`.
- `src/sim/movement.ts` — `Move` (0–8), `wrap`, `moveBy`.
- `src/sim/field.ts` — `buildField`, `senseAt` (the network input window).
- `src/sim/evolution.ts` — `spawn`, `ageAndCull`, `crossover`, `mutate`, `breed`.
- `src/sim/simulation.ts` — `createSim`, `step`, `recreate`; pure functions that return a new `Sim`.
- `src/sim/render.ts` — canvas drawing.
- `src/main.ts` — DOM wiring, stats, Start/Stop/One timer.
- `src/style.css` — only `@import "tailwindcss";`.
- `src/sim/*.test.ts` — Vitest unit tests next to each module.

## Conventions

- Styling uses Tailwind utility classes from the default scale only: no arbitrary values (`w-[20px]`),
  no custom theme values, no hand-written CSS.
- Simulation functions don't mutate their inputs; `step` and `recreate` return a new `Sim`, and
  `main.ts` reassigns it. Hot loops (`evaluate`, `senseAt`, `draw`) use plain indexed loops.
- Constants live in `config.ts`; nothing else hardcodes a size or rate.
- `tsconfig` is `strict` without `noUncheckedIndexedAccess`, so grid and genome indexing stays readable.

## Core data model

- **Agent:** `{ genome, hp, x, y, lifetime }`. Genome and position live on the same object.
- **Field:** `field[x][y]` is an `Int8Array` count of one species' agents per cell, rebuilt every step.
- **Grid:** 200×200, toroidal; every coordinate goes through `wrap`.
- **Genome:** flat `number[]` of length `genomeSize` (9325):
  - `[0, hiddenWeightsFrom)` — input→hidden weights, index `j * inputSize + k`
  - `[hiddenWeightsFrom, biasFrom)` — hidden→output weights, index `hiddenWeightsFrom + j * hiddenSize + k`
  - `[biasFrom, genomeSize)` — hidden biases
- **Network:** 363 inputs → 25 sigmoid hidden → 9 linear outputs. Output index is the move:
  `0 NW, 1 N, 2 NE, 3 W, 4 stay, 5 E, 6 SW, 7 S, 8 SE`. `stayBias` is added to "stay" before argmax.
- **Input:** the 11×11 window row by row, with species counts interleaved per cell `[R,G,B, R,G,B, ...]`.

## Step loop (`simulation.step`)

For each species: `ageAndCull` → `breed` → every agent `evaluate`s and moves → `buildField`.
All of it reads the fields from the previous step, so moves within a step don't see each other.
`main.ts` runs `step` on `setInterval(..., 1)` and redraws every step.

## Rules that are easy to miss

- For species `i`, enemies are `species[(i-1) mod 3]` and prey is `species[(i+1) mod 3]`
  (Red eats Green, Green eats Blue, Blue eats Red).
- HP per step: −`hpPenaltyFromSelfOrEnemy` if the cell has another of your kind or any enemy, +`hpRewardFromPrey` if it has prey, −`baseDecayPerStep` always. Dead at `hp <= 0`.
- Breeding runs only when a species drops below `populationSize - 1`. It adds pairs of children from
  random parents (with replacement) among the top `2 × pairs` survivors by lifetime, at random cells
  with full HP.
- Mutation: with `percent`% odds a child gets exactly `genes` random genes replaced by values in
  `[-2, 2)`. Both values come live from the page inputs.
- Recreate gives every living agent a new random genome and keeps position, HP and lifetime.
- A species that dies out stays extinct (`breed` returns nothing for zero survivors), and `main.ts`
  stops the timer as soon as `extinctSpecies` is non-empty. Start/One do nothing after that.
