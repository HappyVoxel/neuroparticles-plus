/** Flat array of network weights and biases; layout lives in network.ts. */
export type Genome = number[];

/** Agent count per cell, indexed `field[x][y]`. */
export type Field = Int8Array[];

/** A color in OKLCH: lightness (0–1), chroma, hue in degrees. */
export type Oklch = readonly [l: number, c: number, h: number];

export interface Agent {
	genome: Genome;
	hp: number;
	x: number;
	y: number;
	/** Where the agent stood before its last move; the renderer slides from here. */
	prevX: number;
	prevY: number;
	/** Steps survived; an agent can breed from `matureAge` on. */
	lifetime: number;
}

export interface Species {
	id: "R" | "G" | "B";
	name: string;
	/** Young to old; a dot darkens through them as it ages. */
	shades: readonly Oklch[];
	agents: Agent[];
	/** Built at the end of the previous step; everyone reads the same snapshot. */
	field: Field;
}

export interface MutationParams {
	/** Chance (0–100) that a child gets mutated at all. */
	percent: number;
	/** How many random genes a mutated child gets replaced. */
	genes: number;
}

/** A circle of view size, centered on a cell, that costs HP to stand in. */
export interface DiseaseArea {
	x: number;
	y: number;
	/** Index in `Sim.species` of the species whose crowd started it; sets its color. */
	species: number;
	/** Steps in a row with no dot inside; the area clears after `diseaseAfterSteps`. */
	emptySteps: number;
}

export interface Disease {
	areas: DiseaseArea[];
	/** Steps in a row the circle around each cell held a crowd of one species, `x * gridHeight + y`. */
	crowdedSteps: Uint16Array;
	/** HP a dot on each cell loses per step, `[x][y]`; 0 outside every area. */
	cost: Float32Array[];
}

export interface Sim {
	species: Species[];
	step: number;
	mutation: MutationParams;
	/** HP a move into a wall costs; comes live from the Walls control. */
	wallPenalty: number;
	disease: Disease;
}
