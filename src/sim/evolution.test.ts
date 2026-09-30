import { afterEach, describe, expect, it, vi } from "vitest";
import {
	baseDecayPerStep,
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
import { emptyDisease } from "./disease";
import {
	ageAndCull,
	besideMoves,
	breed,
	crossover,
	litterSize,
	mutate,
	siblingMoves,
	spawn,
} from "./evolution";
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
	kills: 0,
});

const species = (agents: Agent[]): Species => ({
	id: "R",
	name: "Red",
	shades: [],
	agents,
	field: buildField(agents),
});

const noMutation = { percent: 0, genes: 1 };
const noDisease = emptyDisease().cost;
const noCapture: Capture = { caught: new Set(), gain: new Map() };

describe("ageAndCull", () => {
	it("only decays a lone agent and adds a step of lifetime", () => {
		const [a] = ageAndCull(species([agent(1, 1)]), noDisease, noCapture);
		expect(a).toMatchObject({ hp: 1000 - baseDecayPerStep, lifetime: 1, kills: 0 });
	});

	it("charges for sharing a cell with your own kind", () => {
		const [a] = ageAndCull(species([agent(1, 1), agent(1, 1)]), noDisease, noCapture);
		expect(a.hp).toBe(1000 - hpPenaltyFromCrowding - baseDecayPerStep);
	});

	it("drops a caught agent whatever its HP", () => {
		const prey = agent(1, 1, startHp);
		const other = agent(2, 2);
		const survivors = ageAndCull(species([prey, other]), noDisease, {
			caught: new Set([prey]),
			gain: new Map(),
		});
		expect(survivors).toHaveLength(1);
		expect(survivors[0]).toMatchObject({ x: 2, y: 2 });
	});

	it("gives a hunter its gain and counts the kill", () => {
		const hunter = agent(1, 1, 1000);
		const [a] = ageAndCull(species([hunter]), noDisease, {
			caught: new Set(),
			gain: new Map([[hunter, 300]]),
		});
		expect(a).toMatchObject({ hp: 1300 - baseDecayPerStep, kills: 1 });
	});

	it("caps a hunter's HP at startHp", () => {
		const hunter = agent(1, 1, startHp - 10);
		const [a] = ageAndCull(species([hunter]), noDisease, {
			caught: new Set(),
			gain: new Map([[hunter, 5000]]),
		});
		expect(a.hp).toBe(startHp - baseDecayPerStep);
	});

	it("charges the disease cost of the agent's cell", () => {
		const cost = emptyDisease().cost;
		cost[1][1] = 750;
		const [a] = ageAndCull(species([agent(1, 1)]), cost, noCapture);
		expect(a.hp).toBe(1000 - 750 - baseDecayPerStep);
	});

	it("drops agents whose HP hits zero and leaves the input alone", () => {
		const self = species([agent(1, 1, baseDecayPerStep), agent(2, 2)]);
		const survivors = ageAndCull(self, noDisease, noCapture);
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

describe("litterSize", () => {
	it("gives twins 90% of the time, one child 9% and triplets 1%", () => {
		expect(litterSize(0)).toBe(2);
		expect(litterSize(0.899)).toBe(2);
		expect(litterSize(0.9)).toBe(1);
		expect(litterSize(0.989)).toBe(1);
		expect(litterSize(0.99)).toBe(3);
		expect(litterSize(0.999)).toBe(3);
	});

	it("has odds that add up to 100% and a cell for every child of the biggest litter", () => {
		const biggest = Math.max(...litterOdds.map((o) => o.children));
		expect(biggest).toBeLessThanOrEqual(besideMoves.length);
		expect(litterOdds.reduce((sum, o) => sum + o.percent, 0)).toBe(100);
		expect(Math.max(...litterOdds.map((o) => o.children))).toBeLessThanOrEqual(siblingMoves.length);
	});
});

describe("breed", () => {
	const best = new Array<number>(genomeSize).fill(1);
	const parent = (x: number, y: number, lifetime = matureAge): Agent => ({
		...agent(x, y, 1000, lifetime),
		genome: best,
	});
	// Pins every random roll, so the litter size is known: 0 twins, 0.95 one child, 0.995 triplets.
	const roll = (value: number) => vi.spyOn(Math, "random").mockReturnValue(value);
	const twins = 0;
	const single = 0.95;
	const triplets = 0.995;
	const cells = (children: readonly Agent[]) => children.map(({ x, y }) => ({ x, y }));
	// How far a dot sees straight out and along a diagonal, in cells.
	const reach = Math.floor(Math.sqrt(visionRadiusSquared));
	const diagonalReach = Math.floor(Math.sqrt(visionRadiusSquared / 2));

	afterEach(() => {
		vi.restoreAllMocks();
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

	it("puts the children of a pair outside each other's view beside the better catcher", () => {
		roll(triplets);
		const catcher = { ...parent(10, 10), kills: 1 };
		const far = parent(10 + reach + 1, 10);
		expect(cells(breed([far, catcher], noMutation))).toEqual([
			{ x: 11, y: 10 },
			{ x: 10, y: 11 },
			{ x: 9, y: 10 },
		]);
	});

	it("pairs a catcher with a mate in view before one out of view", () => {
		roll(single);
		const catcher = { ...parent(10, 10), kills: 3 };
		const farCatcher = { ...parent(100, 100), kills: 2 };
		const neighbor = parent(14, 10);
		const children = breed([farCatcher, neighbor, catcher], noMutation);
		expect(cells(children)).toEqual([{ x: 12, y: 10 }]);
	});

	it("lets the best catchers per step lived fill the open slots", () => {
		roll(twins);
		const gap = 2;
		const still = Array.from({ length: populationSize - gap - 2 }, () => parent(50, 50));
		const oldCatcher = { ...parent(10, 10, matureAge * 10), kills: 5 };
		const youngCatcher = { ...parent(14, 10), kills: 2 };
		const children = breed([...still, oldCatcher, youngCatcher], noMutation);
		expect(cells(children)).toEqual([
			{ x: 12, y: 10 },
			{ x: 13, y: 10 },
		]);
	});

	it("breeds a pair at the edge of the round view", () => {
		roll(single);
		expect(breed([parent(10, 10), parent(10 + reach, 10)], noMutation)).toHaveLength(1);
		expect(breed([parent(10, 10), parent(10, 10 - reach)], noMutation)).toHaveLength(1);
	});

	it("breeds nothing from an agent younger than matureAge", () => {
		const survivors = [parent(10, 10), parent(12, 10, matureAge - 1)];
		expect(breed(survivors, noMutation)).toEqual([]);
	});

	it("puts one fresh child halfway between two mature parents that see each other", () => {
		roll(single);
		const survivors = [parent(10, 20), parent(10 + diagonalReach, 20 - diagonalReach)];
		const children = breed(survivors, noMutation);

		expect(children).toHaveLength(1);
		expect(children[0]).toMatchObject({
			x: Math.floor((10 + 10 + diagonalReach) / 2),
			y: Math.floor((20 + 20 - diagonalReach) / 2),
			hp: startHp,
			lifetime: 0,
		});
		expect(children[0].genome.every((g) => g === 1)).toBe(true);
	});

	it("gives twins the two halves of one crossover, on the midpoint and the cell east of it", () => {
		roll(twins);
		const survivors = [
			{ ...parent(10, 10), genome: new Array<number>(genomeSize).fill(1) },
			{ ...parent(14, 10), genome: new Array<number>(genomeSize).fill(2) },
		];
		const children = breed(survivors, noMutation);

		expect(cells(children)).toEqual([
			{ x: 12, y: 10 },
			{ x: 13, y: 10 },
		]);
		expect(children.map((c) => c.genome[0]).sort()).toEqual([1, 2]);
		for (const child of children) {
			expect(child.genome.every((g) => g === child.genome[0])).toBe(true);
			expect(child).toMatchObject({ hp: startHp, lifetime: 0 });
		}
	});

	it("puts triplets on the midpoint, the cell east and the cell south of it", () => {
		roll(triplets);
		const children = breed([parent(10, 10), parent(14, 10)], noMutation);
		expect(cells(children)).toEqual([
			{ x: 12, y: 10 },
			{ x: 13, y: 10 },
			{ x: 12, y: 11 },
		]);
	});

	it("keeps a litter in a corner inside the walls and on different cells", () => {
		roll(triplets);
		const x = gridWidth - 1;
		const y = gridHeight - 1;
		const children = breed([parent(x, y), parent(x, y)], noMutation);
		expect(cells(children)).toEqual([
			{ x, y },
			{ x: x - 1, y },
			{ x, y: y - 1 },
		]);
	});

	it("lets each agent breed once per step", () => {
		roll(single);
		const survivors = [parent(10, 10), parent(11, 10), parent(12, 10)];
		expect(breed(survivors, noMutation)).toHaveLength(1);
	});

	it("cuts a litter to the open slots", () => {
		roll(triplets);
		const gap = 2;
		const survivors = Array.from({ length: populationSize - gap }, () => parent(10, 10));
		expect(breed(survivors, noMutation)).toHaveLength(gap);
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
