import { describe, expect, it } from "vitest";
import {
	baseDecayPerStep,
	hpPenaltyFromSelfOrEnemy,
	hpRewardFromPrey,
	matureAge,
	populationSize,
	startHp,
	visionRadius,
} from "./config";
import { ageAndCull, breed, crossover, mutate, spawn } from "./evolution";
import { buildField } from "./field";
import { genomeSize } from "./network";
import type { Agent, Species } from "./types";

const agent = (x: number, y: number, hp = 1000, lifetime = 0): Agent => ({
	genome: [],
	hp,
	x,
	y,
	prevX: x,
	prevY: y,
	lifetime,
});

const species = (agents: Agent[]): Species => ({
	id: "R",
	name: "Red",
	color: [255, 0, 0],
	agents,
	field: buildField(agents),
});

const noMutation = { percent: 0, genes: 1 };

describe("ageAndCull", () => {
	it("only decays a lone agent and adds a step of lifetime", () => {
		const [a] = ageAndCull(species([agent(1, 1)]), species([]), species([]));
		expect(a).toMatchObject({ hp: 1000 - baseDecayPerStep, lifetime: 1 });
	});

	it("charges for sharing a cell with your own kind", () => {
		const [a] = ageAndCull(species([agent(1, 1), agent(1, 1)]), species([]), species([]));
		expect(a.hp).toBe(1000 - hpPenaltyFromSelfOrEnemy - baseDecayPerStep);
	});

	it("charges for meeting an enemy and pays for meeting prey", () => {
		const me = species([agent(1, 1)]);
		const there = species([agent(1, 1)]);
		expect(ageAndCull(me, there, species([]))[0].hp).toBe(
			1000 - hpPenaltyFromSelfOrEnemy - baseDecayPerStep,
		);
		expect(ageAndCull(me, species([]), there)[0].hp).toBe(
			1000 + hpRewardFromPrey - baseDecayPerStep,
		);
	});

	it("drops agents whose HP hits zero and leaves the input alone", () => {
		const self = species([agent(1, 1, baseDecayPerStep), agent(2, 2)]);
		const survivors = ageAndCull(self, species([]), species([]));
		expect(survivors).toHaveLength(1);
		expect(self.agents[1].hp).toBe(1000);
	});
});

describe("crossover", () => {
	it("splits every gene between the two children", () => {
		const a = new Array<number>(genomeSize).fill(1);
		const b = new Array<number>(genomeSize).fill(2);
		const [c1, c2] = crossover(a, b);
		for (let j = 0; j < genomeSize; j++) expect(c1[j] + c2[j]).toBe(3);
		expect(c1.some((g) => g === 1) && c1.some((g) => g === 2)).toBe(true);
	});
});

describe("mutate", () => {
	const genome = new Array<number>(genomeSize).fill(10);

	it("changes nothing at 0%", () => {
		expect(mutate(genome, noMutation)).toBe(genome);
	});

	it("replaces up to `genes` genes at 100% without touching the input", () => {
		const mutated = mutate(genome, { percent: 100, genes: 3 });
		const changed = mutated.filter((g) => g !== 10);
		expect(changed.length).toBeGreaterThan(0);
		expect(changed.length).toBeLessThanOrEqual(3);
		expect(genome.every((g) => g === 10)).toBe(true);
	});
});

describe("spawn", () => {
	it("puts the agent on the given cell with full HP", () => {
		expect(spawn([], { x: 3, y: 7 })).toMatchObject({
			x: 3,
			y: 7,
			prevX: 3,
			prevY: 7,
			hp: startHp,
			lifetime: 0,
		});
	});
});

describe("breed", () => {
	const best = new Array<number>(genomeSize).fill(1);
	const parent = (x: number, y: number, lifetime = matureAge): Agent => ({
		...agent(x, y, 1000, lifetime),
		genome: best,
	});

	it("does nothing while the population is at least populationSize - 1", () => {
		const survivors = Array.from({ length: populationSize - 1 }, () => parent(10, 10));
		expect(breed(survivors, noMutation)).toEqual([]);
	});

	it("breeds nothing once every agent has died", () => {
		expect(breed([], noMutation)).toEqual([]);
	});

	it("breeds nothing from a lone survivor", () => {
		expect(breed([parent(10, 10)], noMutation)).toEqual([]);
	});

	it("breeds nothing from a pair outside each other's view", () => {
		const farInX = [parent(10, 10), parent(10 + visionRadius + 1, 10)];
		const farInY = [parent(10, 10), parent(10, 10 + visionRadius + 1)];
		expect(breed(farInX, noMutation)).toEqual([]);
		expect(breed(farInY, noMutation)).toEqual([]);
	});

	it("breeds nothing from an agent younger than matureAge", () => {
		const survivors = [parent(10, 10), parent(12, 10, matureAge - 1)];
		expect(breed(survivors, noMutation)).toEqual([]);
	});

	it("puts one fresh child halfway between two mature parents that see each other", () => {
		const survivors = [parent(10, 20), parent(10 + visionRadius, 20 - visionRadius)];
		const children = breed(survivors, noMutation);

		expect(children).toHaveLength(1);
		expect(children[0]).toMatchObject({
			x: Math.floor((10 + 10 + visionRadius) / 2),
			y: Math.floor((20 + 20 - visionRadius) / 2),
			hp: startHp,
			lifetime: 0,
		});
		expect(children[0].genome.every((g) => g === 1)).toBe(true);
	});

	it("lets each agent breed once per step", () => {
		const survivors = [parent(10, 10), parent(11, 10), parent(12, 10)];
		expect(breed(survivors, noMutation)).toHaveLength(1);
	});

	it("stops once the population is full again", () => {
		const gap = 3;
		const survivors = Array.from({ length: populationSize - gap }, (_, i) => parent(i % 4, 0));
		expect(breed(survivors, noMutation)).toHaveLength(gap);
	});

	it("leaves the survivors alone", () => {
		const survivors = [parent(10, 10), parent(12, 10)];
		const before = structuredClone(survivors);
		breed(survivors, noMutation);
		expect(survivors).toEqual(before);
	});
});
