import {
	baseDecayPerStep,
	crossoverRate,
	gridHeight,
	gridWidth,
	hpPenaltyFromCrowding,
	litterOdds,
	matureAge,
	populationSize,
	startHp,
	visionRadiusSquared,
} from "./config";
import type { Capture } from "./capture";
import { type Move, moveBy, stayMove } from "./movement";
import { genomeSize, randomGene } from "./network";
import type { Agent, DeadAgent, Genome, MutationParams, Species } from "./types";

interface Cell {
	x: number;
	y: number;
}

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

/** A fresh agent with full HP and zeroed counters, at the given cell or a random one. */
export function spawn(
	{ id, genome, bornStep = 0, parents = null }: Birth,
	{ x, y }: Cell = randomCell(),
): Agent {
	return {
		id,
		genome,
		hp: startHp,
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
 * dots that were caught and dots out of HP. A hunter takes its share of the prey's HP, up to
 * `startHp`. Crowding your own kind or standing in disease costs HP.
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
		const hp = Math.min(startHp, agent.hp + eaten) - crowding - disease - baseDecayPerStep;
		const next: Agent = {
			...agent,
			hp,
			kills: share === undefined ? agent.kills : agent.kills + 1,
			lifetime: agent.lifetime + 1,
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

/**
 * Refills a species once it drops below `populationSize - 1`. Agents that lived `matureAge`
 * steps pair up, best catchers first (`killRate`, ties in random order): each takes the best
 * free mature agent in its view, or the best free one anywhere when none is in view. Every pair
 * gets a litter of `litterSize` children, cut to the slots still open: between parents that see
 * each other, beside the first parent otherwise. An agent breeds at most once per step.
 * Children get ids from `nextId` on and birth step `now`; the returned survivors carry the new
 * `children` counts of their parents.
 */
export function breed(
	survivors: readonly Agent[],
	mutation: MutationParams,
	nextId = 0,
	now = 0,
): { survivors: readonly Agent[]; children: Agent[] } {
	if (survivors.length >= populationSize - 1) return { survivors, children: [] };

	const gap = populationSize - survivors.length;
	const mature = shuffled(survivors.filter((agent) => agent.lifetime >= matureAge))
		.map((agent) => ({ agent, rate: killRate(agent) }))
		.sort((a, b) => b.rate - a.rate)
		.map(({ agent }) => agent);
	const paired = new Set<Agent>();
	const litters = new Map<Agent, number>();

	const children: Agent[] = [];
	for (let i = 0; i < mature.length && children.length < gap; i++) {
		const a = mature[i];
		if (paired.has(a)) continue;
		const free = (other: Agent, j: number) => j > i && !paired.has(other);
		const near = mature.find((other, j) => free(other, j) && isNear(a, other));
		const b = near ?? mature.find(free);
		if (!b) continue;
		paired.add(a).add(b);

		const size = Math.min(litterSize(), gap - children.length);
		const from = near ? { x: Math.floor((a.x + b.x) / 2), y: Math.floor((a.y + b.y) / 2) } : a;
		const moves = near ? siblingMoves : besideMoves;
		litterGenomes(a.genome, b.genome, size).forEach((genome, k) => {
			const birth = {
				id: nextId + children.length,
				genome: mutate(genome, mutation),
				bornStep: now,
				parents: [a.id, b.id] as const,
			};
			children.push(spawn(birth, moveBy(from.x, from.y, moves[k])));
		});
		litters.set(a, size).set(b, size);
	}
	if (children.length === 0) return { survivors, children };
	const parents = survivors.map((agent) => {
		const size = litters.get(agent);
		return size === undefined ? agent : { ...agent, children: agent.children + size };
	});
	return { survivors: parents, children };
}
