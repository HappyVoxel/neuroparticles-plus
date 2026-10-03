import { afterEach, describe, expect, it, vi } from "vitest";
import {
	baseDecayPerStep,
	decayStageSteps,
	gridHeight,
	gridWidth,
	hpPenaltyFromCrowding,
	litterOdds,
	matureAge,
	minPopulation,
	primeHp,
	totalPopulation,
	visionRadiusSquared,
} from "./config";
import type { Capture } from "./capture";
import { emptyDisease } from "./disease";
import {
	ageAndCull,
	besideMoves,
	breed,
	crossover,
	decayAt,
	grownHpAt,
	litterSize,
	mutate,
	siblingMoves,
	spawn,
} from "./evolution";
import { buildField } from "./field";
import { genomeSize } from "./network";
import { emptyHallOfFame } from "./records";
import type { Agent, MutationParams, Species } from "./types";

let ids = 0;
const agent = (x: number, y: number, hp = 1000, lifetime = 0): Agent => ({
	...spawn({ id: ids++, genome: [] }, { x, y }),
	hp,
	lifetime,
});

// Adults: past growing, so a step changes HP only by what the test sets up.
const adult = (x: number, y: number, hp = 1000) => agent(x, y, hp, matureAge);

const species = (agents: Agent[]): Species => ({
	id: "R",
	name: "Red",
	shades: [],
	agents,
	field: buildField(agents),
	hallOfFame: emptyHallOfFame(),
	lastDeaths: [],
});

const noMutation = { percent: 0, genes: 1 };
const noDisease = emptyDisease().cost;
const noCapture: Capture = { caught: new Map(), gain: new Map() };
const cull = (...args: Parameters<typeof ageAndCull>) => ageAndCull(...args).survivors;
/** Breeds one species alone; the other two are empty and keep their reserves. */
const litter = (survivors: readonly Agent[], ...rest: [MutationParams, number?, number?]) =>
	breed([survivors, [], []], ...rest).children[0];
const litterAll = (survivors: readonly (readonly Agent[])[]) =>
	breed(survivors, noMutation).children;
// A lone species fills its own reserve and the whole shared pool.
const full = totalPopulation - 2 * minPopulation;

describe("grownHpAt", () => {
	it("rises from 30% at birth to primeHp at matureAge and stays there", () => {
		expect(grownHpAt(0)).toBe(primeHp * 0.3);
		expect(grownHpAt(matureAge / 2)).toBe(primeHp * 0.65);
		expect(grownHpAt(matureAge)).toBe(primeHp);
		expect(grownHpAt(matureAge * 50)).toBe(primeHp);
	});
});

describe("decayAt", () => {
	it("costs the base decay while young", () => {
		expect(decayAt(0)).toBe(baseDecayPerStep);
		expect(decayAt(matureAge - 1)).toBe(baseDecayPerStep);
	});

	it("climbs through the Fibonacci numbers, one per stage, from matureAge on", () => {
		const at = (stage: number) => decayAt(matureAge + stage * decayStageSteps);
		expect([0, 1, 2, 3, 4, 5].map(at)).toEqual(
			[1, 2, 3, 5, 8, 13].map((f) => f * baseDecayPerStep),
		);
		expect(decayAt(matureAge + decayStageSteps - 1)).toBe(baseDecayPerStep);
		expect(at(20)).toBe(17711 * baseDecayPerStep);
	});
});

describe("ageAndCull", () => {
	it("only decays a lone agent and adds a step of lifetime", () => {
		const [a] = cull(species([adult(1, 1)]), noDisease, noCapture, 1);
		expect(a).toMatchObject({ hp: 1000 - baseDecayPerStep, lifetime: matureAge + 1, kills: 0 });
	});

	it("grows a young agent's HP", () => {
		const newborn = spawn({ id: ids++, genome: [] }, { x: 1, y: 1 });
		expect(newborn.hp).toBe(grownHpAt(0));
		const [a] = cull(species([newborn]), noDisease, noCapture, 1);
		expect(a.hp).toBeCloseTo(grownHpAt(1) - baseDecayPerStep);
	});

	it("charges for sharing a cell with your own kind", () => {
		const [a] = cull(species([adult(1, 1), adult(1, 1)]), noDisease, noCapture, 1);
		expect(a.hp).toBe(1000 - hpPenaltyFromCrowding - baseDecayPerStep);
	});

	it("drops a caught agent whatever its HP", () => {
		const prey = adult(1, 1, primeHp);
		const other = adult(2, 2);
		const survivors = cull(
			species([prey, other]),
			noDisease,
			{
				caught: new Map([[prey, { kind: "hp" as const }]]),
				gain: new Map(),
			},
			1,
		);
		expect(survivors).toHaveLength(1);
		expect(survivors[0]).toMatchObject({ x: 2, y: 2 });
	});

	it("gives a hunter its gain and counts the kill", () => {
		const hunter = adult(1, 1, 1000);
		const [a] = cull(
			species([hunter]),
			noDisease,
			{
				caught: new Map(),
				gain: new Map([[hunter, 300]]),
			},
			1,
		);
		expect(a).toMatchObject({ hp: 1300 - baseDecayPerStep, kills: 1 });
	});

	it("lets a hunter's HP pass primeHp", () => {
		const hunter = adult(1, 1, primeHp - 10);
		const [a] = cull(
			species([hunter]),
			noDisease,
			{
				caught: new Map(),
				gain: new Map([[hunter, 5000]]),
			},
			1,
		);
		expect(a.hp).toBe(primeHp + 4990 - baseDecayPerStep);
	});

	it("raises peakHp to a new high and keeps it when HP falls", () => {
		const hunter = { ...adult(1, 1, 1000), peakHp: 2000 };
		const [fed] = cull(
			species([hunter]),
			noDisease,
			{ caught: new Map(), gain: new Map([[hunter, 5000]]) },
			1,
		);
		expect(fed.peakHp).toBe(6000 - baseDecayPerStep);
		const [hungry] = cull(species([fed]), noDisease, noCapture, 2);
		expect(hungry.peakHp).toBe(6000 - baseDecayPerStep);
	});

	it("takes the decay of the agent's age", () => {
		const old = agent(1, 1, 50000, matureAge + 4 * decayStageSteps);
		const [a] = cull(species([old]), noDisease, noCapture, 1);
		expect(a.hp).toBe(50000 - 8 * baseDecayPerStep);
	});

	it("charges the disease cost of the agent's cell", () => {
		const cost = emptyDisease().cost;
		cost[1][1] = 750;
		const [a] = cull(species([adult(1, 1)]), cost, noCapture, 1);
		expect(a.hp).toBe(1000 - 750 - baseDecayPerStep);
	});

	it("drops agents whose HP hits zero and leaves the input alone", () => {
		const self = species([adult(1, 1, baseDecayPerStep), adult(2, 2)]);
		const survivors = cull(self, noDisease, noCapture, 1);
		expect(survivors).toHaveLength(1);
		expect(self.agents[1].hp).toBe(1000);
	});
});

describe("ageAndCull records", () => {
	it("returns a caught dot as dead with its hunters", () => {
		const prey = agent(1, 1);
		const cause = { kind: "caught" as const, by: 2, killers: [7, 8] };
		const { survivors, dead } = ageAndCull(
			species([prey]),
			noDisease,
			{
				caught: new Map([[prey, cause]]),
				gain: new Map(),
			},
			42,
		);
		expect(survivors).toEqual([]);
		expect(dead).toEqual([{ ...prey, diedStep: 42, cause }]);
	});

	it("returns a dot out of HP as dead, with this step's costs counted", () => {
		const { dead } = ageAndCull(species([adult(1, 1, 50), adult(1, 1)]), noDisease, noCapture, 9);
		expect(dead).toHaveLength(1);
		expect(dead[0]).toMatchObject({
			diedStep: 9,
			cause: { kind: "hp" },
			lifetime: matureAge + 1,
			hpLostCrowding: hpPenaltyFromCrowding,
		});
	});

	it("adds up HP eaten, lost to crowding and lost to disease", () => {
		const cost = emptyDisease().cost;
		cost[1][1] = 60;
		const hunter = agent(1, 1);
		const [a] = cull(
			species([hunter, agent(1, 1)]),
			cost,
			{
				caught: new Map(),
				gain: new Map([[hunter, 300]]),
			},
			1,
		);
		expect(a).toMatchObject({
			hpEaten: 300,
			hpLostCrowding: hpPenaltyFromCrowding,
			hpLostDisease: 60,
		});
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
	it("puts the agent on the given cell with a newborn's HP", () => {
		expect(spawn({ id: 5, genome: [] }, { x: 3, y: 7 })).toMatchObject({
			id: 5,
			parents: null,
			kills: 0,
			x: 3,
			y: 7,
			prevX: 3,
			prevY: 7,
			hp: grownHpAt(0),
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

	it("does nothing for a species with fewer than 2 open slots", () => {
		const survivors = Array.from({ length: full - 1 }, () => parent(10, 10));
		expect(litter(survivors, noMutation)).toEqual([]);
	});

	it("breeds nothing once every agent has died", () => {
		expect(litter([], noMutation)).toEqual([]);
	});

	it("breeds nothing from a lone survivor", () => {
		expect(litter([parent(10, 10)], noMutation)).toEqual([]);
	});

	it("puts the children of a pair outside each other's view beside the better catcher", () => {
		roll(triplets);
		const catcher = { ...parent(10, 10), kills: 1 };
		const far = parent(10 + reach + 1, 10);
		expect(cells(litter([far, catcher], noMutation))).toEqual([
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
		const children = litter([farCatcher, neighbor, catcher], noMutation);
		expect(cells(children)).toEqual([{ x: 12, y: 10 }]);
	});

	it("lets the best catchers per step lived fill the open slots", () => {
		roll(twins);
		const gap = 2;
		const still = Array.from({ length: full - gap - 2 }, () => parent(50, 50));
		const oldCatcher = { ...parent(10, 10, matureAge * 10), kills: 5 };
		const youngCatcher = { ...parent(14, 10), kills: 2 };
		const children = litter([...still, oldCatcher, youngCatcher], noMutation);
		expect(cells(children)).toEqual([
			{ x: 12, y: 10 },
			{ x: 13, y: 10 },
		]);
	});

	it("breeds a pair at the edge of the round view", () => {
		roll(single);
		expect(litter([parent(10, 10), parent(10 + reach, 10)], noMutation)).toHaveLength(1);
		expect(litter([parent(10, 10), parent(10, 10 - reach)], noMutation)).toHaveLength(1);
	});

	it("breeds nothing from an agent younger than matureAge", () => {
		const survivors = [parent(10, 10), parent(12, 10, matureAge - 1)];
		expect(litter(survivors, noMutation)).toEqual([]);
	});

	it("puts one fresh child halfway between two mature parents that see each other", () => {
		roll(single);
		const survivors = [parent(10, 20), parent(10 + diagonalReach, 20 - diagonalReach)];
		const children = litter(survivors, noMutation);

		expect(children).toHaveLength(1);
		expect(children[0]).toMatchObject({
			x: Math.floor((10 + 10 + diagonalReach) / 2),
			y: Math.floor((20 + 20 - diagonalReach) / 2),
			hp: grownHpAt(0),
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
		const children = litter(survivors, noMutation);

		expect(cells(children)).toEqual([
			{ x: 12, y: 10 },
			{ x: 13, y: 10 },
		]);
		expect(children.map((c) => c.genome[0]).sort()).toEqual([1, 2]);
		for (const child of children) {
			expect(child.genome.every((g) => g === child.genome[0])).toBe(true);
			expect(child).toMatchObject({ hp: grownHpAt(0), lifetime: 0 });
		}
	});

	it("puts triplets on the midpoint, the cell east and the cell south of it", () => {
		roll(triplets);
		const children = litter([parent(10, 10), parent(14, 10)], noMutation);
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
		const children = litter([parent(x, y), parent(x, y)], noMutation);
		expect(cells(children)).toEqual([
			{ x, y },
			{ x: x - 1, y },
			{ x, y: y - 1 },
		]);
	});

	it("lets each agent breed once per step", () => {
		roll(single);
		const survivors = [parent(10, 10), parent(11, 10), parent(12, 10)];
		expect(litter(survivors, noMutation)).toHaveLength(1);
	});

	it("cuts a litter to the open slots", () => {
		roll(triplets);
		const gap = 2;
		const survivors = Array.from({ length: full - gap }, () => parent(10, 10));
		expect(litter(survivors, noMutation)).toHaveLength(gap);
	});

	it("stops once the population is full again", () => {
		const gap = 3;
		const survivors = Array.from({ length: full - gap }, (_, i) => parent(i % 4, 0));
		expect(litter(survivors, noMutation)).toHaveLength(gap);
	});

	it("numbers the children from nextId and names their parents and birth step", () => {
		roll(twins);
		// The better catcher comes first in `parents`.
		const a = { ...parent(10, 10), kills: 1 };
		const b = parent(14, 10);
		const children = litter([b, a], noMutation, 500, 77);
		expect(children.map(({ id, parents, bornStep }) => ({ id, parents, bornStep }))).toEqual([
			{ id: 500, parents: [a.id, b.id], bornStep: 77 },
			{ id: 501, parents: [a.id, b.id], bornStep: 77 },
		]);
	});

	it("counts the litter on both parents", () => {
		roll(twins);
		const a = parent(10, 10);
		const b = parent(14, 10);
		const loner = parent(100, 100, matureAge - 1);
		const { survivors } = breed([[a, b, loner], [], []], noMutation);
		expect(survivors[0].map((s) => s.children)).toEqual([2, 2, 0]);
		expect(survivors[0][2]).toBe(loner);
		expect(a.children).toBe(0);
	});

	it("leaves the survivors alone", () => {
		const survivors = [[parent(10, 10), parent(12, 10)], [], []];
		const before = structuredClone(survivors);
		breed(survivors, noMutation);
		expect(survivors).toEqual(before);
	});

	describe("shared budget", () => {
		// Immature dots that hold slots without breeding.
		const holders = (n: number) => Array.from({ length: n }, () => parent(50, 50, matureAge - 1));
		const counts = (children: readonly Agent[][]) => children.map((c) => c.length);

		it("hands the open pool slots to the species with the best catcher", () => {
			roll(twins);
			const gap = 2;
			const red = [{ ...parent(10, 10), kills: 3 }, parent(14, 10), ...holders(minPopulation - 2)];
			const green = [
				{ ...parent(10, 10), kills: 1 },
				parent(14, 10),
				...holders(minPopulation - 2),
			];
			const blue = holders(totalPopulation - 2 * minPopulation - gap);
			expect(counts(litterAll([red, green, blue]))).toEqual([gap, 0, 0]);
		});

		it("lets a species below its reserve breed while the pool is full", () => {
			roll(twins);
			const red = [parent(10, 10), parent(14, 10)];
			const blue = holders(full);
			expect(counts(litterAll([red, [], blue]))).toEqual([2, 0, 0]);
		});

		it("stops a species at the pool even when another is below its reserve", () => {
			roll(twins);
			const red = [parent(10, 10), parent(14, 10)];
			const blue = [parent(10, 10), parent(14, 10), ...holders(full - 2)];
			expect(counts(litterAll([red, [], blue]))).toEqual([2, 0, 0]);
		});

		it("never breeds past the budget", () => {
			roll(triplets);
			const gap = 2;
			const red = [parent(10, 10), parent(14, 10), ...holders(minPopulation)];
			const green = holders(minPopulation);
			const blue = holders(totalPopulation - red.length - green.length - gap);
			expect(counts(litterAll([red, green, blue]))).toEqual([gap, 0, 0]);
		});
	});
});
