import type { Species } from "./types";

// World
export const gridWidth = 200;
export const gridHeight = 200;
export const cellPixels = 3;

// Playback
export const minStepsPerSecond = 5;
export const maxStepsPerSecond = 100;
export const defaultStepsPerSecond = 20;
// Up to this speed dots slide between cells; above it a frame covers more than one step.
export const maxSlidingStepsPerSecond = 60;
// Longest the sim may run inside one animation frame before it has to draw.
export const stepBudgetMs = 8;

// Each agent sees a (2r+1)×(2r+1) window around itself, one channel per species.
export const visionRadius = 5;
// What a cell outside the grid reads on its first channel (the others read 0). Real counts are
// never negative, so the network can tell a wall from an empty cell.
export const wallSense = -1;

// Rock-paper-scissors: each species gains HP from the next one and loses it to the previous one
// (Red eats Green, Green eats Blue, Blue eats Red).
export const speciesDefs: readonly Pick<Species, "id" | "name" | "color">[] = [
	{ id: "R", name: "Red", color: [255, 0, 0] },
	{ id: "G", name: "Green", color: [0, 255, 0] },
	{ id: "B", name: "Blue", color: [0, 0, 255] },
];
export const speciesCount = speciesDefs.length;

// Network: input → hidden (sigmoid) → output (linear), one output per move.
export const inputSize = (2 * visionRadius + 1) ** 2 * speciesCount;
export const hiddenSize = 25;
export const outputSize = 9;
export const stayBias = 1;

// Life
export const populationSize = 200;
export const startHp = 10000;
export const hpPenaltyFromSelfOrEnemy = 100;
export const hpRewardFromPrey = 100;
// Wall bump cost: the starting value and the range of its slider. At `maxWallPenalty` one bump
// kills a dot with full HP.
export const hpPenaltyFromWall = 100;
export const maxWallPenalty = startHp;
export const wallPenaltyStep = 100;
export const baseDecayPerStep = 1;

// Genetic algorithm
export const crossoverRate = 0.5;
export const geneRange = 4; // genes are random in [-2, 2)
