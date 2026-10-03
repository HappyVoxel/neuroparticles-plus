/** Flat array of network weights and biases; layout lives in network.ts. */
export type Genome = number[];

/** A grid cell. */
export interface Cell {
	x: number;
	y: number;
}

/** Agent count per cell, indexed `field[x][y]`. */
export type Field = Int8Array[];

/** A color in OKLCH: lightness (0–1), chroma, hue in degrees. */
export type Oklch = readonly [l: number, c: number, h: number];

export interface Agent {
	/** Unique within a run; `Sim.nextId` hands them out. */
	id: number;
	genome: Genome;
	hp: number;
	x: number;
	y: number;
	/** Where the agent stood before its last move; the renderer slides from here. */
	prevX: number;
	prevY: number;
	/** Steps survived; an agent can breed from `matureAge` on. */
	lifetime: number;
	/** Prey it caught, alone or shared; the best catchers per step lived breed first. */
	kills: number;
	/** Sim step it was born on. */
	bornStep: number;
	/** Ids of both parents; null for a dot of the first generation or a Randomize. */
	parents: readonly [number, number] | null;
	children: number;
	/** Moves it picked: stand still, one cell, knight jump. */
	stays: number;
	steps: number;
	jumps: number;
	/** Moves that ran into a wall. */
	wallBumps: number;
	/** HP taken from prey. */
	hpEaten: number;
	hpLostCrowding: number;
	hpLostDisease: number;
	hpLostWall: number;
}

/**
 * Why a dot died: caught by hunters (`by` is their species' index in `Sim.species`, `killers`
 * their ids), or out of HP.
 */
export type DeathCause =
	{ kind: "caught"; by: number; killers: readonly number[] } | { kind: "hp" };

/** A dot at the moment it died. */
export interface DeadAgent extends Agent {
	diedStep: number;
	cause: DeathCause;
}

/** What a hall of fame ranks by. */
export type Ranking = "kills" | "lifetime";

/** Which dots the top-dots board lists: the dead or not, and each species by its index. */
export interface TopDotsFilter {
	dead: boolean;
	species: readonly boolean[];
}

/** The best dead dots of a species, best first, at most `hallOfFameSize` per ranking. */
export type HallOfFame = Readonly<Record<Ranking, readonly DeadAgent[]>>;

export interface Species {
	id: "R" | "G" | "B";
	name: string;
	/** Young to old; a dot darkens through them as it ages. */
	shades: readonly Oklch[];
	agents: Agent[];
	/** Built at the end of the previous step; everyone reads the same snapshot. */
	field: Field;
	hallOfFame: HallOfFame;
	/** Dots that died on the last step; lets a followed dot's death be seen. */
	lastDeaths: readonly DeadAgent[];
}

export interface MutationParams {
	/** Chance (0–100) that a child gets mutated at all. */
	percent: number;
	/** How many random genes a mutated child gets replaced. */
	genes: number;
}

/** A circle centered on a cell that costs HP to stand in. */
export interface DiseaseArea {
	/** Unique in a run, from `Disease.nextId`. */
	id: number;
	x: number;
	y: number;
	/** In cells; grows and shrinks with its own species' dots inside. */
	radius: number;
	/** Index in `Sim.species` of the species whose crowd started it; sets its color. */
	species: number;
	/** Steps in a row with no dot inside; the area clears after `diseaseAfterSteps`. */
	emptySteps: number;
	/** The step it was born. */
	bornStep: number;
	/** The step it first reached `pandemicRadius`, kept as it shrinks; null while it never has. */
	pandemicStep: number | null;
}

export interface Disease {
	areas: DiseaseArea[];
	/** The id the next new area gets. */
	nextId: number;
	/** Steps in a row the circle around each cell held a crowd of one species, `x * gridHeight + y`. */
	crowdedSteps: Uint16Array;
	/** HP a dot on each cell loses per step, `[x][y]`; 0 outside every area. */
	cost: Float32Array[];
}

/**
 * The sim as the page sees it: the worker sends each step without the genomes (about 100 KB a
 * dot), the fields and the disease grids. A `Sim` fits it too.
 */
export type AgentView = Omit<Agent, "genome">;
export type DeadAgentView = Omit<DeadAgent, "genome">;

export interface SpeciesView extends Pick<Species, "id" | "name" | "shades"> {
	agents: readonly AgentView[];
	hallOfFame: Readonly<Record<Ranking, readonly DeadAgentView[]>>;
	lastDeaths: readonly DeadAgentView[];
}

export interface SimView {
	species: readonly SpeciesView[];
	step: number;
	disease: { areas: readonly DiseaseArea[] };
}

export interface Sim {
	species: Species[];
	step: number;
	mutation: MutationParams;
	/** HP a move into a wall costs; comes live from the Walls control. */
	wallPenalty: number;
	disease: Disease;
	/** The id the next new agent gets. */
	nextId: number;
}
