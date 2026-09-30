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
import type { Agent, Genome, MutationParams, Species } from "./types";

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

/** A fresh agent with full HP, at the given cell or a random one. */
export function spawn(genome: Genome, { x, y }: Cell = randomCell()): Agent {
	return { genome, hp: startHp, x, y, prevX: x, prevY: y, lifetime: 0, kills: 0 };
}

/** True when each agent stands inside the other's view. */
export function isNear(a: Cell, b: Cell): boolean {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy <= visionRadiusSquared;
}

/**
 * Applies one step of HP change and drops the dead: dots that were caught and dots out of HP.
 * A hunter takes its share of the prey's HP, up to `startHp`. Crowding your own kind or standing
 * in disease costs HP.
 */
export function ageAndCull(
	self: Species,
	diseaseCost: readonly Float32Array[],
	{ caught, gain }: Capture,
): Agent[] {
	const survivors: Agent[] = [];
	for (const agent of self.agents) {
		if (caught.has(agent)) continue;
		const { x, y } = agent;
		const eaten = gain.get(agent);
		let hp = eaten === undefined ? agent.hp : Math.min(startHp, agent.hp + eaten);
		if (self.field[x][y] > 1) hp -= hpPenaltyFromCrowding;
		hp -= diseaseCost[x][y] + baseDecayPerStep;
		if (hp > 0) {
			const kills = eaten === undefined ? agent.kills : agent.kills + 1;
			survivors.push({ ...agent, hp, kills, lifetime: agent.lifetime + 1 });
		}
	}
	return survivors;
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
 */
export function breed(survivors: readonly Agent[], mutation: MutationParams): Agent[] {
	if (survivors.length >= populationSize - 1) return [];

	const gap = populationSize - survivors.length;
	const mature = shuffled(survivors.filter((agent) => agent.lifetime >= matureAge)).sort(
		(a, b) => killRate(b) - killRate(a),
	);
	const paired = new Set<Agent>();

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
		const x = near ? Math.floor((a.x + b.x) / 2) : a.x;
		const y = near ? Math.floor((a.y + b.y) / 2) : a.y;
		const moves = near ? siblingMoves : besideMoves;
		litterGenomes(a.genome, b.genome, size).forEach((genome, k) => {
			children.push(spawn(mutate(genome, mutation), moveBy(x, y, moves[k])));
		});
	}
	return children;
}
