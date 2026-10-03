# Architecture notes

What a new agent needs to know before changing how dots behave. `AGENTS.md` has the file layout
and the short rules; this file has the reasoning and the long rules.

## Where behavior comes from

- A dot has no goal and gets no reward. Its network is stateless: each step it reads its view and
  picks a move (`evaluate`, `pickMove` in `src/sim/network.ts`). Nothing is learned in a lifetime.
- Behavior changes only through selection: who dies (`capture`, `ageAndCull`) and who breeds
  (`breed` in `src/sim/evolution.ts`). To change what dots "want", change one of those two.
- Breeding order is the fitness. Mature dots of every species pair up by `kills` ÷ `lifetime`,
  highest first. HP does not buy children, so an HP reward on its own changes nothing; see
  `docs/hunting-research.md`.
- Species size is an outcome, not a setting. All species share `totalPopulation` dots, each keeps
  `minPopulation` of its own, and the best hunters of any species fill the rest. The plan and the
  headless results are in `docs/shared-population-plan.md`.

## Genome

A flat `number[]` of `genomeSize` (12,550) values, each random in [-2, 2) at birth. It holds the
network's weights and biases and nothing else. Offsets live in `src/sim/network.ts`.

| Range            | Count  | What                                                   |
| ---------------- | ------ | ------------------------------------------------------ |
| 0 to 12,099      | 12,100 | input → hidden weights, 484 inputs × 25 hidden neurons |
| 12,100 to 12,524 | 425    | hidden → output weights, 25 hidden × 17 moves          |
| 12,525 to 12,549 | 25     | one bias per hidden neuron                             |

Not in the genome:

- State or memory. The same view always gives the same move.
- Traits such as speed, view size, HP or litter size. Every dot gets the same constants from
  `src/sim/config.ts`; speed by age comes from `lifetime` (`moveCount`).
- Output biases. Only the hidden layer has them; "stay" gets the fixed `stayBias` at pick time.
- A species marker. All genomes have the same shape, and a dot only breeds within its species.

A child's genome is a uniform `crossover` of its parents', then `mutate` replaces `genes` values
with `percent`% odds. A heritable trait beyond behavior would be extra genes after the biases,
read by the sim and not by the network: `genomeSize`, `crossover` and `mutate` then cover it as is.

Genomes are heavy, about 100 KB per dot. The worker keeps them; the page gets `AgentView` without
them (`simView` in `src/sim/host.ts`). The hall of fame keeps the genomes of its dead.

## Step order

`step` in `src/sim/simulation.ts`: `capture` for all species, `ageAndCull` for each species,
one `breed` for all species into the shared budget, then every dot `evaluate`s and moves and each
species' field is rebuilt, then `spreadDisease`. Everything reads the previous step's positions,
fields and disease, so moves within a step don't see each other.

## Disease

`src/sim/disease.ts`. The circle of view size around a cell counts a crowded step while it holds
more than `diseaseCrowd` dots of one species outside disease, and resets otherwise. Cells past
`diseaseAfterSteps` in a row start one `DiseaseArea` per crowd, of the species with the most dots,
on the middle of the crowd, born at view size. An area that reaches `pandemicRadius` is a pandemic
for good (`pandemicStep`). Dots inside an area and cells inside one never count a crowd, so areas
don't pile up.

Each step an area's `radius` moves at most one cell toward `targetRadius` of its own species' dots
inside (the size that keeps its birth density), between `diseaseMinRadius` and `diseaseMaxRadius`:
it grows as its dots walk in and shrinks as they leave or die. Every dot inside, of any species,
loses `diseaseHpAtCenter` HP per step on the center, falling linearly to `diseaseHpAtEdge` at the
area's own edge. Overlaps never stack: a cell costs its worst area. An area clears after more than
`diseaseAfterSteps` steps with no dot inside. `draw` fills each area in its species' 300 shade at
`diseaseOpacity`, one shape per species, under the dots.

## Children

A pair gets a litter sized by `litterOdds` (`litterSize`), cut to its species' open slots. Children
start with `birthHp`. The first lands on the cell halfway between the parents, the second one cell
E, the third one cell S (`siblingMoves`), so siblings don't pay the crowding penalty. Children of a
pair out of each other's view land E, S and W of the first parent (`besideMoves`). Twins get the
two halves of one `crossover`; a third child gets its own.

Until `carryUntilAge` (20) a child is carried: `moveAll` moves everyone else first, then places it
in its `carrySlot` (E, S, W by birth order) beside its parent's new cell. It runs no network, counts
no move and pays no wall cost. Its parent is `parentOf`: the first parent while alive, else the
second. An orphan moves itself from birth. A dot carrying a child doesn't breed (`carrying` in
`breed`), so it has one litter at a time; without that, top hunters breed nearly every step and
carry dozens of children on three cells.

From `carryUntilAge` on, the child moves itself with its own network. A hunter feeds
`feedSharePercent` of each catch to its children younger than `matureAge` in its view (`capture`),
carried or not.
