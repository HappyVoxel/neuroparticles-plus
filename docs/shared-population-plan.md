# Shared population

Plan from 2026-09-30. Goal: make "my species will be the largest" a real outcome. Today every
species sits at `populationSize` (200), so "largest" is a three-way tie, and `breed` refills each
species on its own.

## Rules

- One budget of `totalPopulation` (600) dots for all species. Each species keeps `minPopulation`
  (30) slots of its own; the other 510 are a shared pool that any species can fill.
- A species uses the pool with every dot above its reserve. Its open slots are its reserve room
  plus what is left of the pool.
- `breed` runs once for all species: every mature dot of every species goes into one list, best
  catchers per step lived first (ties in random order). Each pairs within its own species as now,
  in view first, anywhere otherwise, and gets a litter cut to its species' open slots. Breeding
  starts at 2 open slots, as today.
- Reset gives each species `totalPopulation / speciesCount` dots, so the world starts full and the
  pool only opens as dots die.
- Extinction is unchanged: a species with no dots stays extinct and the sim stops.

## Steps

1. `src/sim/config.ts` — replace `populationSize` with `totalPopulation` and `minPopulation`.
2. `src/sim/evolution.ts` — `breed` takes the survivors of every species (`readonly Agent[][]`)
   and returns survivors and children per species. Merge the mature lists, sort by `killRate`,
   pair within species, count open slots per species from the reserve and the pool.
3. `src/sim/simulation.ts` — `step` culls every species, breeds all at once, then moves and
   builds fields. `createSim` spawns `totalPopulation / speciesCount` per species.
4. `src/sim/evolution.test.ts` — the `litter` helper wraps one species as `[survivors, [], []]`;
   "full" becomes `totalPopulation - 2 * minPopulation`. New cases: the shared slots go to the
   species with the best catcher; a species below its reserve breeds while the pool is full; a
   species can't breed past the pool even when another is below its reserve; the total never
   passes `totalPopulation`.
5. `src/sim/simulation.test.ts` — start count per species and a total-at-most-budget check.
6. `src/components/species-stats.tsx`, `src/components/food-cycle.tsx` — bar and node size are the
   species' share of `totalPopulation`, so a species that takes the pool visibly grows.
7. `AGENTS.md` (breeding bullet) and README (population wording) say the new rule.
8. Verify: `npx vitest run src`, `npm run typecheck`, `npm run lint`. Then 3 headless runs of
   20,000 steps of the real source: stay share, each species' lowest and highest count,
   extinctions, and whether the lead changes hands.

## Counter-arguments

- Rock-paper-scissors punishes the leader: the biggest species is its predator's food, so the lead
  should cycle. That is the intended live race; nobody wins for good.
- Extinction gets likelier than today, since the leaders take a shrinking species' pool slots.
  The reserve keeps 30 slots per species but only mature pairs can fill them; a species whose
  adults all die still goes extinct.
- A species with no kills only ever breeds into its reserve, so a still species shrinks to 30.
  That is the point, and it is also the strongest push toward hunting the sim has had.

## Results

Three headless runs of 20,000 steps (`.exp/shared.ts`, mutation 5% × 1 gene, wall cost 500) on
2026-09-30, reported per 2,500-step window:

| Run | Stay at end | Lowest count | Highest count | Lead changes | Died out |
| --- | ----------- | ------------ | ------------- | ------------ | -------- |
| 1   | 24%         | 2            | 540           | 130          | no       |
| 2   | 17%         | 19           | 540           | 102          | no       |
| 3   | 11%         | 26           | 540           | 118          | no       |

- The lead changes hands about every 150 to 200 steps, the rock-paper-scissors cycle in action. A
  species regularly takes the whole pool (540) and falls back to its reserve within a window.
- Stay stays at 9 to 31% per window, in line with the per-species cap.
- The reserve is a weak guard: a species dips under 30 whenever its adults die faster than they
  breed, and run 1 saw Red fall to 2 dots before it climbed back. Expect some runs to end in an
  extinction. If that happens too often, the next lever is "young can't be caught" from
  `docs/hunting-research.md`, not a bigger reserve.
