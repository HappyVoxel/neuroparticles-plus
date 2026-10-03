import {
	baseDecayPerStep,
	birthHpPercent,
	crossoverRate,
	decayStageSteps,
	gridHeight,
	gridWidth,
	hpPenaltyFromCrowding,
	litterOdds,
	matureAge,
	minPopulation,
	speciesCount,
	primeHp,
	totalPopulation,
	visionRadiusSquared,
} from "./config";
import type { Capture } from "./capture";
import { type Move, moveBy, stayMove } from "./movement";
import { genomeSize, randomGene } from "./network";
import type { Agent, Cell, DeadAgent, Genome, MutationParams, Species } from "./types";

function randomCell(): Cell {
	return {
		x: Math.floor(Math.random() * gridWidth),
		y: Math.floor(Math.random() * gridHeight),
	};
}

interface Birth {
	id: number;
	genome: Genome;
	bornStep?: number;
	parents?: Agent["parents"];
}

const birthHp = (primeHp * birthHpPercent) / 100;

/** How far a dot has grown at an age: from `birthHp` up to `primeHp` at `matureAge`, in a straight line. */
export function grownHpAt(lifetime: number): number {
	if (lifetime >= matureAge) return primeHp;
	return birthHp + ((primeHp - birthHp) * lifetime) / matureAge;
}

/**
 * HP lost per step at an age: `baseDecayPerStep` while young, then times 1, 2, 3, 5, 8, … (the
 * Fibonacci numbers), one more per `decayStageSteps` steps from `matureAge` on.
 */
export function decayAt(lifetime: number): number {
	if (lifetime < matureAge) return baseDecayPerStep;
	const stage = Math.floor((lifetime - matureAge) / decayStageSteps);
	let a = 1;
	let b = 2;
	for (let k = 0; k < stage; k++) [a, b] = [b, a + b];
	return baseDecayPerStep * a;
}

/** A fresh agent with a newborn's HP and zeroed counters, at the given cell or a random one. */
export function spawn(
	{ id, genome, bornStep = 0, parents = null }: Birth,
	{ x, y }: Cell = randomCell(),
): Agent {
	return {
		id,
		genome,
		hp: grownHpAt(0),
		peakHp: grownHpAt(0),
		x,
		y,
		prevX: x,
		prevY: y,
		lifetime: 0,
		kills: 0,
		bornStep,
		parents,
		children: 0,
		stays: 0,
		steps: 0,
		jumps: 0,
		wallBumps: 0,
		hpEaten: 0,
		hpLostCrowding: 0,
		hpLostDisease: 0,
		hpLostWall: 0,
	};
}

/** True when each agent stands inside the other's view. */
function isNear(a: Cell, b: Cell): boolean {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy <= visionRadiusSquared;
}

/**
 * Applies one step of HP change and splits the dots into survivors and the dead of step `now`:
 * dots that were caught and dots out of HP. A young dot's HP grows (`grownHpAt`), a hunter takes
 * its share of the prey's HP, and every dot loses `decayAt` its age. Crowding your own kind or
 * standing in disease costs HP.
 */
export function ageAndCull(
	self: Species,
	diseaseCost: readonly Float32Array[],
	{ caught, gain }: Capture,
	now: number,
): { survivors: Agent[]; dead: DeadAgent[] } {
	const survivors: Agent[] = [];
	const dead: DeadAgent[] = [];
	for (const agent of self.agents) {
		const cause = caught.get(agent);
		if (cause) {
			dead.push({ ...agent, diedStep: now, cause });
			continue;
		}
		const { x, y } = agent;
		const share = gain.get(agent);
		const eaten = share ?? 0;
		const crowding = self.field[x][y] > 1 ? hpPenaltyFromCrowding : 0;
		const disease = diseaseCost[x][y];
		const lifetime = agent.lifetime + 1;
		const growth = grownHpAt(lifetime) - grownHpAt(agent.lifetime);
		const hp = agent.hp + growth + eaten - crowding - disease - decayAt(agent.lifetime);
		const next: Agent = {
			...agent,
			hp,
			peakHp: Math.max(agent.peakHp, hp),
			kills: share === undefined ? agent.kills : agent.kills + 1,
			lifetime,
			hpEaten: agent.hpEaten + eaten,
			hpLostCrowding: agent.hpLostCrowding + crowding,
			hpLostDisease: agent.hpLostDisease + disease,
		};
		if (hp > 0) survivors.push(next);
		else dead.push({ ...next, diedStep: now, cause: { kind: "hp" } });
	}
	return { survivors, dead };
}

/** Uniform crossover: each gene goes to one child and the other parent's gene to the other. */
export function crossover(a: Readonly<Genome>, b: Readonly<Genome>): [Genome, Genome] {
	const child1: Genome = [];
	const child2: Genome = [];
	for (let j = 0; j < genomeSize; j++) {
		const keep = Math.random() < crossoverRate;
		child1[j] = keep ? a[j] : b[j];
		child2[j] = keep ? b[j] : a[j];
	}
	return [child1, child2];
}

/** With `percent`% odds, replaces `genes` random genes with new random values. */
export function mutate(genome: Genome, { percent, genes }: MutationParams): Genome {
	if (Math.random() >= percent / 100) return genome;
	const mutated = [...genome];
	for (let m = 0; m < genes; m++) {
		mutated[Math.floor(Math.random() * genomeSize)] = randomGene();
	}
	return mutated;
}

function shuffled<T>(items: readonly T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/** How many children a pair gets: a roll in [0, 1) against `litterOdds`. */
export function litterSize(roll: number = Math.random()): number {
	let threshold = 0;
	for (const { children, percent } of litterOdds) {
		threshold += percent;
		if (roll * 100 < threshold) return children;
	}
	return litterOdds[litterOdds.length - 1].children;
}

/**
 * Where each child of a litter lands, seen from the cell halfway between its parents: on it,
 * one cell E, one cell S. Siblings on one cell would pay the crowding penalty every step. E and
 * S shift different axes, so the cells stay apart after a bounce off a wall.
 */
export const siblingMoves: readonly Move[] = [stayMove, 5, 7];

/** Where the children of a pair that can't see each other land, seen from the first parent: E, S, W. */
export const besideMoves: readonly Move[] = [5, 7, 3];

/** Genomes for one litter. Twins get the two halves of one crossover. */
function litterGenomes(a: Readonly<Genome>, b: Readonly<Genome>, size: number): Genome[] {
	const genomes: Genome[] = [];
	while (genomes.length < size) genomes.push(...crossover(a, b));
	return genomes.slice(0, size);
}

/** Prey caught per step lived. */
function killRate(agent: Agent): number {
	return agent.kills / agent.lifetime;
}

/** The slots beyond every species' reserve, open to whichever species breeds first. */
const sharedPool = totalPopulation - speciesCount * minPopulation;

/**
 * Open slots per species: its reserve room, plus what is left of the shared pool once every
 * species' dots above its reserve are counted.
 */
function openSlots(counts: readonly number[]): number[] {
	let used = 0;
	for (const count of counts) used += Math.max(0, count - minPopulation);
	const left = Math.max(0, sharedPool - used);
	return counts.map((count) => Math.max(0, minPopulation - count) + left);
}

interface Candidate {
	agent: Agent;
	species: number;
	rate: number;
}

/**
 * Breeds every species at once into one budget of `totalPopulation` dots: each species keeps
 * `minPopulation` slots of its own and shares the rest. Mature agents (`matureAge` steps lived)
 * of all species pair up, best catchers first (`killRate`, ties in random order): each takes the
 * best free mature agent of its species in its view, or the best free one anywhere when none is
 * in view. Every pair gets a litter of `litterSize` children, cut to its species' open slots:
 * between parents that see each other, beside the first parent otherwise. A species breeds only
 * when it starts the step with 2 or more open slots. An agent breeds at most once per step. Children get ids from `nextId` on and birth
 * step `now`; the returned survivors carry the new `children` counts of their parents.
 */
export function breed(
	survivors: readonly (readonly Agent[])[],
	mutation: MutationParams,
	nextId = 0,
	now = 0,
): { survivors: readonly (readonly Agent[])[]; children: Agent[][] } {
	const counts = survivors.map((agents) => agents.length);
	const children: Agent[][] = survivors.map(() => []);
	let born = 0;
	const total = counts.reduce((sum, count) => sum + count, 0);
	// A species with 1 open slot waits for the next death, as a pair usually gets twins.
	const breeding = openSlots(counts).map((open) => open >= 2);

	const mature: Candidate[] = shuffled(
		survivors.flatMap((agents, species) =>
			agents
				.filter((agent) => agent.lifetime >= matureAge)
				.map((agent) => ({ agent, species, rate: killRate(agent) })),
		),
	).sort((a, b) => b.rate - a.rate);
	const paired = new Set<Agent>();
	const litters = new Map<Agent, number>();

	for (let i = 0; i < mature.length && total + born < totalPopulation; i++) {
		const { agent: a, species } = mature[i];
		if (paired.has(a) || !breeding[species]) continue;
		const open = openSlots(counts)[species];
		if (open === 0) continue;
		const free = (other: Candidate, j: number) =>
			j > i && other.species === species && !paired.has(other.agent);
		const near = mature.find((other, j) => free(other, j) && isNear(a, other.agent));
		const b = (near ?? mature.find(free))?.agent;
		if (!b) continue;
		paired.add(a).add(b);

		const size = Math.min(litterSize(), open);
		const from = near ? { x: Math.floor((a.x + b.x) / 2), y: Math.floor((a.y + b.y) / 2) } : a;
		const moves = near ? siblingMoves : besideMoves;
		litterGenomes(a.genome, b.genome, size).forEach((genome, k) => {
			const birth = {
				id: nextId + born,
				genome: mutate(genome, mutation),
				bornStep: now,
				parents: [a.id, b.id] as const,
			};
			children[species].push(spawn(birth, moveBy(from.x, from.y, moves[k])));
			born++;
		});
		counts[species] += size;
		litters.set(a, size).set(b, size);
	}
	if (born === 0) return { survivors, children };
	const parents = survivors.map((agents) =>
		agents.map((agent) => {
			const size = litters.get(agent);
			return size === undefined ? agent : { ...agent, children: agent.children + size };
		}),
	);
	return { survivors: parents, children };
}
