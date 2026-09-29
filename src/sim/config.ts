import type { Species } from "./types";

// World
export const gridWidth = 200;
export const gridHeight = 200;
export const cellPixels = 3;

// Each agent sees a (2r+1)×(2r+1) window around itself, one channel per species.
export const visionRadius = 5;

// Rock-paper-scissors: each species gains HP from the next one and loses it to the previous one
// (Red eats Green, Green eats Blue, Blue eats Red).
export const speciesDefs: readonly Pick<Species, "id" | "color">[] = [
	{ id: "R", color: [255, 0, 0] },
	{ id: "G", color: [0, 255, 0] },
	{ id: "B", color: [0, 0, 255] },
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
export const baseDecayPerStep = 1;

// Genetic algorithm
export const crossoverRate = 0.5;
export const geneRange = 4; // genes are random in [-2, 2)
