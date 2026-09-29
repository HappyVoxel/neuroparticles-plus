import {
	baseDecayPerStep,
	crossoverRate,
	gridHeight,
	gridWidth,
	hpPenaltyFromSelfOrEnemy,
	hpRewardFromPrey,
	matureAge,
	populationSize,
	startHp,
	visionRadius,
} from "./config";
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
	return { genome, hp: startHp, x, y, prevX: x, prevY: y, lifetime: 0 };
}

/** True when each agent stands inside the other's view window. */
export function isNear(a: Cell, b: Cell): boolean {
	return Math.abs(a.x - b.x) <= visionRadius && Math.abs(a.y - b.y) <= visionRadius;
}

/**
 * Applies one step of HP change from the cell each agent stands on and drops the dead.
 * Crowding your own kind or meeting an enemy costs HP; meeting prey gives HP.
 */
export function ageAndCull(self: Species, enemies: Species, prey: Species): Agent[] {
	const survivors: Agent[] = [];
	for (const agent of self.agents) {
		const { x, y } = agent;
		let hp = agent.hp;
		if (self.field[x][y] > 1 || enemies.field[x][y] > 0) hp -= hpPenaltyFromSelfOrEnemy;
		if (prey.field[x][y] > 0) hp += hpRewardFromPrey;
		hp -= baseDecayPerStep;
		if (hp > 0) survivors.push({ ...agent, hp, lifetime: agent.lifetime + 1 });
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

/**
 * Refills a species once it drops below `populationSize - 1`. Agents that lived `matureAge`
 * steps pair up in random order, each with a mature neighbor that is still free, and every
 * pair gets one child on the cell halfway between them. An agent breeds at most once per step,
 * so a species with no two mature agents in view of each other gets no children.
 */
export function breed(survivors: readonly Agent[], mutation: MutationParams): Agent[] {
	if (survivors.length >= populationSize - 1) return [];

	const gap = populationSize - survivors.length;
	const mature = shuffled(survivors.filter((agent) => agent.lifetime >= matureAge));
	const paired = new Set<Agent>();

	const children: Agent[] = [];
	for (let i = 0; i < mature.length && children.length < gap; i++) {
		const a = mature[i];
		if (paired.has(a)) continue;
		const b = mature.find((other, j) => j > i && !paired.has(other) && isNear(a, other));
		if (!b) continue;
		paired.add(a).add(b);

		const [genome] = crossover(a.genome, b.genome);
		const cell = { x: Math.floor((a.x + b.x) / 2), y: Math.floor((a.y + b.y) / 2) };
		children.push(spawn(mutate(genome, mutation), cell));
	}
	return children;
}
