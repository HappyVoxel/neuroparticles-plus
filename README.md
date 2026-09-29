# Neuroparticles

![Neuroparticles after 623 steps: the field on the left, controls and species stats on the right](images/preview.png)

Each teeny-weeny dot is a lil organism. It sees (using a neural network) what's around it and moves
depending on what it sees. If it survives long enough, it produces offspring. If not, bb lil dot, you
were brave, but other dots were more brave.

Three species, red, green and blue, share a 200×200 field in a rock-paper-scissors loop: red eats
green, green eats blue, blue eats red. Every dot has its own small neural network, and a genetic
algorithm breeds the longest-lived survivors. Nobody programs the behavior; it comes out of local
sensing and selection pressure.

## Controls

| Control          | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| Run / Pause      | Starts or pauses the simulation                                 |
| Step             | Advances one step while paused                                  |
| Randomize brains | Gives every dot a new random brain, after you confirm           |
| Chance per child | How likely a newborn is to mutate (0–100%)                      |
| Genes changed    | How many weights a mutation replaces                            |
| Theme toggle     | Switches light and dark; follows your system setting by default |

The sidebar shows the food cycle live: each species' dot grows and shrinks with its population, and
the rows under it show how many are alive and how long the oldest has survived. If a species dies out,
the run stops.

## How it works

**Perception.** Each dot sees the 11×11 cells around it, counting red, green and blue dots separately:
363 numbers in all.

**Brain.** A fully connected network: 363 inputs → 25 sigmoid neurons (with biases) → 9 outputs, one
per move (8 directions or stay). The highest output wins, with a small bonus for staying put.

**Health.** Every dot starts with 10,000 HP. Each step it loses 1 HP, loses 100 HP if it shares a
cell with its own kind or any predator, and gains 100 HP if it shares a cell with prey. Bumping into
a wall costs 100 HP. At 0 HP it dies.

**Evolution.** A genome is the flat list of all the network's weights and biases. When a species drops
below 199 dots, it refills with children bred from its longest-lived survivors:

- **Selection:** parents are drawn at random from the top survivors by lifetime.
- **Crossover:** uniform. Each gene comes from one parent, and the sibling gets the other's.
- **Mutation:** with the chosen chance, a newborn gets that many weights replaced by random values in
  `[-2, 2)`.
- **Placement:** children appear at random cells with full HP.

**World.** The 200×200 grid has walls at the edges: a dot that steps into one bounces back, and
dots see the walls inside their view. All dots move at the same time, each
reacting to where everyone was at the end of the previous step.

## Development

Requires Node.js. Built with TypeScript, React, [shadcn/ui](https://ui.shadcn.com) and Tailwind CSS,
bundled with Vite.

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # typecheck, then a static site in dist/
```

`dist/` uses relative paths, so it can be hosted from any folder. Open it through a server
(`npm run preview` works); browsers block ES modules on `file://`.

| Path                | What's there                                                             |
| ------------------- | ------------------------------------------------------------------------ |
| `src/sim/`          | The simulation in plain TypeScript: network, perception, evolution, step |
| `src/sim/config.ts` | Every tunable constant: grid size, population, HP rules, mutation range  |
| `src/hooks/`        | `useSimulation` (runs the sim outside React) and `useTheme`              |
| `src/components/`   | The page: canvas, controls, food cycle, species stats, mutation          |

## Credits

Neuroparticles was created by **Serhii Herasymov** ([xcontcom](https://github.com/xcontcom)). The
simulation, the neural network and genetic algorithm design, and the RGB predator-prey mode all come
from the [original project](https://github.com/xcontcom/neuroparticles).

This fork keeps that simulation and rebuilds everything around it: TypeScript modules with unit tests,
a React and shadcn/ui interface, and a stop when a species dies out.

## License

MIT. The original copyright notice is kept in [LICENSE](LICENSE).
