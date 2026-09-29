/** Flat array of network weights and biases; layout lives in network.ts. */
export type Genome = number[];

/** Agent count per cell, indexed `field[x][y]`. */
export type Field = Int8Array[];

export type Rgb = readonly [number, number, number];

export interface Agent {
	genome: Genome;
	hp: number;
	x: number;
	y: number;
	/** Steps survived; the fitness used to pick parents. */
	lifetime: number;
}

export interface Species {
	id: "R" | "G" | "B";
	color: Rgb;
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
}
