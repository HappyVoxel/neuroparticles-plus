# Neuroparticles

![Preview](images/neuroparticles_preview.png)

Each teeny-weeny dot is a lil organism. It sees (using a neural network) what's around it and moves depending on what it sees. If it survives long enough - it produces offspring. If not - bb lil dot, you were brave, but other dots were more brave.

**Neuroparticles** is a real-time artificial life simulation based on:

- **Neural Networks** - Each agent uses a fully connected feedforward network:
  - **Input Layer**: 363 inputs from three 11×11 channels (Red, Green, Blue).
  - **Hidden Layer**: 25 neurons with sigmoid activation.
  - **Output Layer**: 9 outputs corresponding to 8 movement directions + stay.
  - **Bias terms** are included in the hidden layer.

- **Genetic Algorithm**:
  - The **genome** is a flat array of all network weights and biases.
  - **Fitness** is measured by lifetime (survival time).
  - **Crossover**: uniform crossover between random survivors.
  - **Mutation**: replaces random weights with new random values.

- **Toroidal Grid**: 200×200 field with wraparound edges (toroidal topology).
- **Local Perception**: Each agent only sees a limited 11×11 area centered on itself.
- **Self-organization**: No global rules. All behavior emerges from local sensing and reproduction pressure.

---

## Overview

- **Particles**: 600 total (200 Red, 200 Green, 200 Blue)
- **Input**: 3-channel input from Red, Green, and Blue fields
- **Dynamic**:
  - Red gains HP from Green, loses from Blue
  - Green gains from Blue, loses from Red
  - Blue gains from Red, loses from Green
- **Behavior**: Evolving predator-prey arms race

---

## 🧠 Neural Network Architecture

- **Input size**: `363`
- **Hidden layer**: 25 sigmoid neurons
- **Output size**: 9 (8 directions + stay)
- **Activation**: `sigmoid(x) = 1 / (1 + e^(-x))`
- **Decision**: Max output determines movement

---

## ⚙️ Evolution Parameters

- **Genotype**: Raw neural weights + biases
- **Crossover**: Uniform (per-gene random split)
- **Mutation**: Random value replacement in `[-2, 2]`
- **Selection**: Based on lifetime (survival time)
- **Reproduction**: Best survivors create 2 children each generation

---

## 🛠 Development

Written in TypeScript, bundled with Vite, styled with Tailwind CSS. Requires Node.js.

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # unit tests
npm run build    # static site in dist/
```

The simulation lives in `src/sim/`, one module per concern: `network.ts` (the brain), `field.ts` (what an
agent sees), `evolution.ts` (death and breeding), `simulation.ts` (one step), `render.ts` (canvas),
and `main.ts` (page wiring). All tunable constants are in `src/sim/config.ts`.

---

## 📜 License

MIT License

---

## 👤 Author

Serhii Herasymov
