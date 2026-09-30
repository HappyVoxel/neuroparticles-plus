import type { MutationParams, Oklch, Species, TopDotsFilter } from "./types";

// World
export const gridWidth = 200;
export const gridHeight = 200;
export const cellPixels = 3;
// Ages are rounded to this many colors per species, so `fillStyle` repeats the same few strings.
export const ageColorSteps = 64;

// Playback
export const minStepsPerSecond = 5;
export const maxStepsPerSecond = 100;
export const defaultStepsPerSecond = 20;
// The Speed slider moves in steps of its minimum.
export const stepsPerSecondStep = minStepsPerSecond;
// Up to this speed dots slide between cells; above it a frame covers more than one step.
export const maxSlidingStepsPerSecond = 60;
// Longest the sim may run inside one animation frame before it has to draw.
export const stepBudgetMs = 8;

// Picking a dot to follow: a click takes the nearest dot within this many cells, or within
// `loupePickCells` while the loupe (Z) is on. The loupe shows the canvas at `loupeZoom`× in a
// circle `loupeDiameterPx` CSS pixels wide.
export const pickCells = 3;
export const loupePickCells = 1;
export const loupeZoom = 4;
export const loupeDiameterPx = 160;
// The ring around the followed dot: Tailwind's yellow-400, like the inspected area's frame.
export const followRingColor: Oklch = [0.852, 0.199, 91.936];
// The star glow on each species' top living hunter: a soft core `glowCoreCells` wide and eight
// rays, `glowRayWidthCells` wide at the base. The four straight rays swing from `glowMinCells` to
// `glowMaxCells` long and back once every `glowPeriodMs`, the diagonals `glowDiagonalRatio` of
// that, and the opacity at the center swings with them from `glowMinOpacity` to `glowMaxOpacity`.
export const glowPeriodMs = 1200;
export const glowMinCells = 4;
export const glowMaxCells = 8;
export const glowDiagonalRatio = 0.5;
export const glowCoreCells = 1.5;
export const glowRayWidthCells = 0.5;
export const glowMinOpacity = 0.4;
export const glowMaxOpacity = 0.9;
// Dead dots kept per species and ranking (kills, lifetime), each with its genome (about 100 KB).
export const hallOfFameSize = 20;
// Dots shown in the sidebar's top list.
export const topDotsShown = 3;

// Each agent sees every cell with dx² + dy² <= visionRadiusSquared around itself, one channel per
// species. 37 makes a round view of 121 cells: 6 cells straight out, 4 along a diagonal.
export const visionRadiusSquared = 37;
export const visionRadius = Math.sqrt(visionRadiusSquared);
// The cells in view as offsets from the agent, row by row. The network input follows this order.
export const visionCells: readonly (readonly [dx: number, dy: number])[] = (() => {
	const reach = Math.floor(visionRadius);
	const cells: [dx: number, dy: number][] = [];
	for (let dy = -reach; dy <= reach; dy++) {
		for (let dx = -reach; dx <= reach; dx++) {
			if (dx * dx + dy * dy <= visionRadiusSquared) cells.push([dx, dy]);
		}
	}
	return cells;
})();
// What a cell outside the grid reads on its first channel (the others read 0). Real counts are
// never negative, so the network can tell a wall from an empty cell.
export const wallSense = -1;

// Rock-paper-scissors: each species catches the next one and is caught by the previous one
// (Red eats Green, Green eats Blue, Blue eats Red).
// Shades are Tailwind v4's 300, 400, 500, 600 and 700 (tailwindcss/theme.css). The sidebar uses
// the middle one, 500.
export const speciesDefs: readonly Pick<Species, "id" | "name" | "shades">[] = [
	{
		id: "R",
		name: "Red",
		shades: [
			[0.808, 0.114, 19.571],
			[0.704, 0.191, 22.216],
			[0.637, 0.237, 25.331],
			[0.577, 0.245, 27.325],
			[0.505, 0.213, 27.518],
		],
	},
	{
		id: "G",
		name: "Green",
		shades: [
			[0.871, 0.15, 154.449],
			[0.792, 0.209, 151.711],
			[0.723, 0.219, 149.579],
			[0.627, 0.194, 149.214],
			[0.527, 0.154, 150.069],
		],
	},
	{
		id: "B",
		name: "Blue",
		shades: [
			[0.809, 0.105, 251.813],
			// biome-ignore lint/suspicious/noApproximativeNumericConstant: Tailwind's 70.7%, not √½.
			[0.707, 0.165, 254.624],
			[0.623, 0.214, 259.815],
			[0.546, 0.245, 262.881],
			[0.488, 0.243, 264.376],
		],
	},
];
export const speciesCount = speciesDefs.length;
// The top-dots board lists every dot until the filter hides some.
export const allTopDots: TopDotsFilter = { dead: true, species: speciesDefs.map(() => true) };

// Network: input → hidden (sigmoid) → output (linear), one output per move. Each cell in view reads
// one channel per species plus one for disease.
export const inputSize = visionCells.length * (speciesCount + 1);
export const hiddenSize = 25;
export const outputSize = 17;
export const stayBias = 1;

// Life
export const populationSize = 200;
export const startHp = 10000;
// Sharing a cell with your own kind costs this per step. Sharing one with a hunter is death: the
// hunters on the cell split the dot's HP, each up to `startHp`.
export const hpPenaltyFromCrowding = 100;
// Wall bump cost: the starting value and the range and step of its slider.
export const hpPenaltyFromWall = 500;
export const minWallPenalty = 0;
export const maxWallPenalty = 1000;
export const wallPenaltyStep = 100;
export const baseDecayPerStep = 1;

// Disease: a circle the size of the view (dx² + dy² <= visionRadiusSquared) where more than
// `diseaseCrowd` dots of one species stood for more than `diseaseAfterSteps` steps in a row turns
// into a disease area of that size. Each step its radius moves by at most one cell toward the size
// that holds its own species' dots inside at the density it was born with (diseaseCrowd + 1 dots in
// the view), between `diseaseMinRadius` and `diseaseMaxRadius` cells. It clears once no dot has been
// inside it for more than `diseaseAfterSteps` steps. A dot inside loses `diseaseHpAtEdge` HP per
// step at the edge, rising to `diseaseHpAtCenter` at the center. Overlapping areas don't add up: a
// cell costs its worst one.
export const diseaseCrowd = 13;
export const diseaseAfterSteps = 20;
export const diseaseHpAtEdge = 50;
export const diseaseHpAtCenter = 100;
export const diseaseMinRadius = 1;
export const diseaseMaxRadius = 12;
// An area that reaches this radius becomes a pandemic and stays one.
export const pandemicRadius = 10;
// An area's label over the canvas, "Disease!" at birth or "Pandemic!", shows for `diseaseLabelMs`
// at the current speed and fades out over its last `diseaseLabelFade` of that. Its font is
// `diseaseLabelSizeRatio` cells per cell of radius, at least `diseaseLabelMinCells`, and a letter
// takes about `diseaseLabelEmPerChar` of that; a label that would come within `diseaseLabelGap`
// of its size of one already showing is left out.
export const diseaseLabelMs = 2500;
export const diseaseLabelFade = 0.4;
export const diseaseLabelSizeRatio = 0.8;
export const diseaseLabelMinCells = 4;
export const diseaseLabelEmPerChar = 0.62;
export const diseaseLabelGap = 0.5;
// An area is painted in the 300 shade (lightest) of the species that crowded it, at this opacity, no border.
export const diseaseOpacity = 0.2;

// Genetic algorithm
// Steps an agent has to survive before it can breed.
export const matureAge = 100;
// Young agents (below `matureAge`) and old ones (from `oldAge` on) only get the one-cell moves;
// adults in between can also knight-jump. Old is the last 20% of a life without food.
export const oldAge = Math.round(0.8 * (startHp / baseDecayPerStep));
export const crossoverRate = 0.5;
// Children per breeding pair. The percents add up to 100.
export const litterOdds: readonly { children: number; percent: number }[] = [
	{ children: 2, percent: 90 },
	{ children: 1, percent: 9 },
	{ children: 3, percent: 1 },
];
export const geneRange = 4; // genes are random in [-2, 2)
// What the Mutation controls start at, and their limits (genes up to `genomeSize`).
export const defaultMutation: MutationParams = { percent: 5, genes: 1 };
export const minMutationPercent = 0;
export const maxMutationPercent = 100;
export const minMutationGenes = 1;
