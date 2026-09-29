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

export interface Sim {
	species: Species[];
	step: number;
	mutation: MutationParams;
	/** HP a move into a wall costs; comes live from the Walls control. */
	wallPenalty: number;
}
