# Neuroparticles+

![Neuroparticles+ at step 400: the field on the left with a blue disease and a red pandemic, controls, population and top dots on the right](images/preview.png)

Each teeny-weeny dot is a lil organism. It sees (using a neural network) what's around it and moves
depending on what it sees. If it survives long enough, it produces offspring. If not, bb lil dot, you
were brave, but other dots were more brave.

Three species, red, green and blue, share a 200×200 field in a rock-paper-scissors loop: red eats
green, green eats blue, blue eats red. Every dot has its own small neural network, and a genetic
algorithm breeds the best hunters. Nobody programs the behavior; it comes out of local sensing and
selection pressure.

Live at [npp.happyvoxel.com](https://npp.happyvoxel.com).

## Controls

| Control          | What it does                                                  |
| ---------------- | ------------------------------------------------------------- |
| Run / Pause      | Starts or pauses the simulation (Space)                       |
| Step             | Advances one step while paused (S)                            |
| Randomize brains | Gives every dot a new random brain, after you confirm         |
| Reset            | Starts a new run at step 0 with fresh dots, after you confirm |
| Speed            | Steps per second, 5 to 100                                    |
| Bump cost        | HP a dot loses for walking into a wall, 0 to 1,000            |
| Chance per child | How likely a newborn is to mutate, 0 to 100%                  |
| Genes changed    | How many weights a mutation replaces                          |
| Sound            | Music (off by default), sound effects and volume              |
| Theme            | Light or dark; follows your system setting by default         |

Speed, bump cost, mutation and the top-dots filter are kept across a page refresh. The Population
rows show how many dots of each species are alive, how long the oldest has lived and the most kills
any of them has, with a bar for its share of the shared budget; its info button shows the food
cycle, each species sized by its population. If a species dies out, the run stops; Reset starts a
new one.

## Watching a run

- **Colors and size:** a dot goes from its species' lightest shade at birth to the darkest for the
  species' oldest living dot. It's born at 40% of a cell and grows to a full cell by step 100. It
  fades to half brightness as it loses HP. Overlapping dots blend brighter.
- **Oldest dot:** each species' oldest living dot wears a pulsing star.
- **Top hunter:** each species' living dot with the most kills wears crossed swords.
- **Disease! / Pandemic!:** a label pops up over a new disease area, and again when one turns into a
  pandemic.
- **Follow a dot:** click one to follow it. Its record shows when it was born, its parents and
  children, its kills, how it moves (stay, step or jump), where its HP came from and went, and
  "Copy genome". The record stays after the dot dies and says what killed it.
- **Loupe:** Z shows a 4× magnifier under the pointer, for picking one dot out of a crowd. Esc
  turns it off.
- **Top dots:** the three best dots by kills, by steps lived and by the highest HP they reached,
  the dead included, in short numbers (hover for the full one). Click one to follow it; the filter
  hides the dead or a species.
- **Area stats:** drag a box on the field to see dots, average age, average HP and top kills per
  species inside it, live while the sim runs.

## How it works

**Perception.** Each dot sees a circle of 121 cells around it, 6 cells straight out and 4 along a
diagonal, counting red, green and blue dots separately and reading how much disease each cell costs:
484 numbers in all.

**Brain.** A fully connected network: 484 inputs → 25 sigmoid neurons (with biases) → 17 outputs, one
per move (16 directions or stay). The 8 main directions step to a neighboring cell; the 8 in-between
ones (NNE, ENE, …) are knight jumps, one cell along one axis and two along the other. The highest
output wins, with a small bonus for staying put.

**Speed.** Young dots (under 100 steps) and old ones (8,000 steps and up) only step to a neighboring
cell. Adults in between can also knight-jump, so they are the fastest.

**Health.** A dot is born with 3,000 HP and gains HP only by eating, with no cap. While it's
younger than 100 steps, its parents feed it: a parent that catches prey with the child in view
passes it half of the catch. For its first 20 steps a child rides beside its parent; after that it
moves itself. A parent with a child on board
doesn't breed again until it lets go. HP drains faster with age: 1 HP per step until step 100, then 1, 2, 3, 5, 8,
13, … per step, one step up every 1,000 steps. There's no age limit: a dot lives as long as it eats
enough to keep up. Each step a dot loses 1 HP, and 100 HP more if it shares a cell with
its own kind. Bumping into a wall costs 300 HP by default; the Bump cost slider changes it while the
sim runs. At 0 HP it dies.

**Hunting.** A dot that ends a step on the same cell as its predator dies. The predators on that cell
split its HP equally, and each counts a kill.

**Disease.** When more than 13 dots of one species stay in the same view-sized circle for more than
20 steps in a row, a disease area starts on the middle of that crowd, tinted in that species' color.
Each step it grows or shrinks by one cell to keep its own species' dots inside at the density it
started with, its radius staying between 1 and 12 cells. An area that reaches a radius of 10 is a
pandemic for good. Every dot inside, whatever its species, loses 50 HP per step at the edge, up to
100 HP at the center. Overlapping areas don't add up. An area clears once no dot has been inside it
for more than 20 steps.

**Evolution.** A genome is the flat list of all the network's weights and biases. The three species
share a budget of 600 dots: each keeps 30 slots of its own, and the other 510 go to whichever species
breeds first. Dots that die free slots, and the best hunters of any species refill them:

- **Selection:** a dot can breed once it has lived 100 steps. Mature dots of all species pair up in
  order of prey caught per step lived, best first. Each takes the best free mature dot of its species
  inside its view, or the best one anywhere when it sees none. A dot breeds once per step.
- **Litter:** a pair gets 2 children 90% of the time, 1 child 9% and 3 children 1%, never more than
  its species has room for. A species with no kills only breeds into its own 30 slots.
- **Crossover:** uniform. Each gene of a child comes from one of the two parents. Twins split the
  parents' genes between them.
- **Mutation:** with the chosen chance (5% by default), a newborn gets that many weights (1 by
  default) replaced by random values in `[-2, 2)`.
- **Placement:** the first child appears halfway between its parents, its siblings on the cells next
  to it. When the parents can't see each other, the children appear next to the first parent. All
  start small, with 3,000 HP.

**World.** The 200×200 grid has walls at the edges: a dot that steps into one bounces back, and
dots see the walls inside their view. All dots move at the same time, each reacting to where
everyone was at the end of the previous step. The sim runs in a Web Worker a few steps ahead of the
screen, so a slow machine slows the sim, not the page.

## Development

Requires Node.js 24 and pnpm. Built with TypeScript, React, [shadcn/ui](https://ui.shadcn.com) and
Tailwind CSS, bundled with Vite.

```sh
pnpm install
pnpm dev         # dev server at http://localhost:5173
pnpm test        # unit tests (Vitest)
pnpm lint        # Biome
pnpm build       # typecheck, then a static site in dist/
```

`dist/` uses relative paths, so it can be hosted from any folder. Open it through a server
(`pnpm preview` works); browsers block ES modules on `file://`.

Every push to `master` builds a Docker image and deploys it to Easypanel through Woodpecker CI; see
[docs/deployment.md](docs/deployment.md).

| Path                | What's there                                                             |
| ------------------- | ------------------------------------------------------------------------ |
| `src/sim/`          | The simulation in plain TypeScript: network, perception, evolution, step |
| `src/sim/config.ts` | Every tunable constant: grid size, population, HP rules, disease, speed  |
| `src/sim/worker.ts` | The Web Worker that runs the sim off the main thread                     |
| `src/hooks/`        | `useSimulation` (talks to the worker, draws frames), theme, sound, keys  |
| `src/components/`   | The page: canvas, controls, population, top dots, dot record, area stats |

## Credits

Neuroparticles was created by **Serhii Herasymov** ([xcontcom](https://github.com/xcontcom)). The
simulation, the neural network and genetic algorithm design, and the RGB predator-prey mode all come
from the [original project](https://github.com/xcontcom/neuroparticles).

This fork keeps that simulation and rebuilds everything around it: TypeScript modules with unit tests,
a React and shadcn/ui interface, and many things useful for inspection.

## License

MIT. The original copyright notice is kept in [LICENSE](LICENSE).
