import {
	baseDecayPerStep,
	crossoverRate,
	gridHeight,
	gridWidth,
	hpPenaltyFromSelfOrEnemy,
	hpRewardFromPrey,
	populationSize,
	startHp,
} from "./config";
import { genomeSize, randomGene } from "./network";
import type { Agent, Genome, MutationParams, Species } from "./types";

/** A fresh agent at a random cell with full HP. */
export function spawn(genome: Genome): Agent {
	const x = Math.floor(Math.random() * gridWidth);
	const y = Math.floor(Math.random() * gridHeight);
	return { genome, hp: startHp, x, y, prevX: x, prevY: y, lifetime: 0 };
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

/**
 * Refills a species once it drops below `populationSize - 1`: pairs of children bred from
 * random parents among the top `2 × pairs` survivors by lifetime (with replacement).
 * A species with no survivors stays extinct.
 */
export function breed(survivors: readonly Agent[], mutation: MutationParams): Agent[] {
	if (survivors.length === 0 || survivors.length >= populationSize - 1) return [];

	const pairs = Math.floor((populationSize - survivors.length) / 2);
	const pool = [...survivors]
		.sort((a, b) => b.lifetime - a.lifetime)
		.slice(0, pairs * 2)
		.map((agent) => agent.genome);
	const pickParent = () => pool[Math.floor(Math.random() * pool.length)];

	const children: Agent[] = [];
	for (let i = 0; i < pairs; i++) {
		const [child1, child2] = crossover(pickParent(), pickParent());
		children.push(spawn(mutate(child1, mutation)), spawn(mutate(child2, mutation)));
	}
	return children;
}
