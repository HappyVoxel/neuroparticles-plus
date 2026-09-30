import { describe, expect, it } from "vitest";
import {
	diseaseAfterSteps,
	diseaseCrowd,
	diseaseHpAtCenter,
	diseaseHpAtEdge,
	diseaseMaxRadius,
	diseaseMinRadius,
	gridHeight,
	pandemicRadius,
	visionRadiusSquared,
} from "./config";
import {
	circleCounts,
	costGrid,
	diseaseBirthRadius,
	diseaseCostAt,
	emptyDisease,
	spreadDisease,
	targetRadius,
} from "./disease";
import { buildField } from "./field";
import { spawn } from "./evolution";
import type { Agent, Disease, Field } from "./types";

const at = (x: number, y: number): Agent => ({ ...spawn({ id: 0, genome: [] }, { x, y }), hp: 1 });

const crowd = (n: number, x: number, y: number): Field =>
	buildField(Array.from({ length: n }, () => at(x, y)));

const empty = buildField([]);
const cell = (x: number, y: number): number => x * gridHeight + y;

function run(disease: Disease, fields: readonly Field[], steps: number): Disease {
	let next = disease;
	for (let s = 0; s < steps; s++) next = spreadDisease(next, fields, s + 1);
	return next;
}

describe("diseaseCostAt", () => {
	it("costs the most on the center and the least at the edge", () => {
		expect(diseaseCostAt(0, diseaseBirthRadius)).toBe(diseaseHpAtCenter);
		expect(diseaseCostAt(visionRadiusSquared, diseaseBirthRadius)).toBeCloseTo(diseaseHpAtEdge);
		expect(diseaseCostAt(9, diseaseBirthRadius)).toBeLessThan(diseaseCostAt(4, diseaseBirthRadius));
	});

	it("stretches the same fall-off over a bigger area", () => {
		expect(diseaseCostAt(100, 10)).toBeCloseTo(diseaseHpAtEdge);
		expect(diseaseCostAt(25, 10)).toBeGreaterThan(diseaseCostAt(25, 5));
	});
});

describe("targetRadius", () => {
	it("is the birth size for the crowd that starts an area", () => {
		expect(targetRadius(diseaseCrowd + 1)).toBeCloseTo(diseaseBirthRadius);
	});

	it("covers twice the cells for twice the dots", () => {
		expect(targetRadius(2 * (diseaseCrowd + 1)) ** 2).toBeCloseTo(2 * visionRadiusSquared);
	});

	it("stays between the smallest and biggest radius", () => {
		expect(targetRadius(0)).toBe(diseaseMinRadius);
		expect(targetRadius(10_000)).toBe(diseaseMaxRadius);
	});
});

describe("circleCounts", () => {
	it("counts a dot in every circle it stands in", () => {
		const counts = circleCounts(crowd(2, 50, 50));
		expect(counts[cell(50, 50)]).toBe(2);
		expect(counts[cell(56, 50)]).toBe(2);
		expect(counts[cell(54, 54)]).toBe(2);
		expect(counts[cell(57, 50)]).toBe(0);
		expect(counts[cell(55, 55)]).toBe(0);
	});

	it("leaves out dots standing where `cost` is above 0", () => {
		const cost = emptyDisease().cost;
		cost[50][50] = 1;
		expect(circleCounts(crowd(2, 50, 50), cost)[cell(50, 50)]).toBe(0);
	});
});

describe("spreadDisease", () => {
	const crowded = [crowd(diseaseCrowd + 1, 50, 50), empty, empty];

	it("turns a crowded circle into an area only after it stays crowded long enough", () => {
		const before = run(emptyDisease(), crowded, diseaseAfterSteps);
		expect(before.areas).toEqual([]);
		expect(before.crowdedSteps[cell(50, 50)]).toBe(diseaseAfterSteps);

		const after = spreadDisease(before, crowded, diseaseAfterSteps + 1);
		expect(after.areas).toEqual([
			{
				id: expect.any(Number),
				x: 50,
				y: 50,
				radius: diseaseBirthRadius,
				species: 0,
				emptySteps: 0,
				bornStep: diseaseAfterSteps + 1,
				pandemicStep: null,
			},
		]);
		expect(after.cost[50][50]).toBe(diseaseHpAtCenter);
		expect(after.crowdedSteps[cell(50, 50)]).toBe(0);
	});

	it("never counts a crowd of `diseaseCrowd` or mixed species", () => {
		expect(
			run(emptyDisease(), [crowd(diseaseCrowd, 50, 50), empty, empty], 1).crowdedSteps[
				cell(50, 50)
			],
		).toBe(0);
		const mixed = [crowd(6, 50, 50), crowd(6, 50, 50), empty];
		expect(run(emptyDisease(), mixed, 1).crowdedSteps[cell(50, 50)]).toBe(0);
	});

	it("gives the area to the species with the biggest crowd", () => {
		const both = [crowd(diseaseCrowd + 1, 50, 50), crowd(diseaseCrowd + 2, 50, 50), empty];
		const disease = run(emptyDisease(), both, diseaseAfterSteps + 1);
		expect(disease.areas).toEqual([
			{
				id: expect.any(Number),
				x: 50,
				y: 50,
				radius: diseaseBirthRadius,
				species: 1,
				emptySteps: 0,
				bornStep: diseaseAfterSteps + 1,
				pandemicStep: null,
			},
		]);
	});

	it("starts one area per crowd, on the middle of it", () => {
		const split = [
			buildField([
				...Array.from({ length: 7 }, () => at(48, 50)),
				...Array.from({ length: 7 }, () => at(52, 50)),
			]),
			empty,
			empty,
		];
		const one = run(emptyDisease(), split, diseaseAfterSteps + 1);
		expect(one.areas.map(({ x, y }) => [x, y])).toEqual([[50, 50]]);

		const two = [
			buildField([
				...Array.from({ length: diseaseCrowd + 1 }, () => at(50, 50)),
				...Array.from({ length: diseaseCrowd + 1 }, () => at(150, 150)),
			]),
			empty,
			empty,
		];
		const apart = run(emptyDisease(), two, diseaseAfterSteps + 1);
		expect(apart.areas.map(({ x, y }) => [x, y])).toEqual([
			[50, 50],
			[150, 150],
		]);
	});

	it("starts counting over once the crowd leaves", () => {
		const half = run(emptyDisease(), crowded, 50);
		expect(spreadDisease(half, [empty, empty, empty], 1).crowdedSteps[cell(50, 50)]).toBe(0);
	});

	it("uses the worst cost where areas overlap, never the sum", () => {
		const area = { radius: diseaseBirthRadius, species: 0, emptySteps: 0, bornStep: 0 };
		const cost = costGrid([
			{ ...area, id: 0, x: 50, y: 50, pandemicStep: null },
			{ ...area, id: 1, x: 52, y: 50, pandemicStep: null },
		]);
		expect(cost[50][50]).toBe(diseaseHpAtCenter);
		expect(cost[51][50]).toBeCloseTo(diseaseCostAt(1, diseaseBirthRadius), 4);
	});

	const oneArea = (radius: number, emptySteps = 0): Disease => {
		const areas = [
			{ id: 0, x: 50, y: 50, radius, species: 0, emptySteps, bornStep: 0, pandemicStep: null },
		];
		return { ...emptyDisease(), areas, nextId: 1, cost: costGrid(areas) };
	};
	const nobody = [empty, empty, empty];

	it("clears an area once it has stayed empty long enough", () => {
		const lingering = run(oneArea(diseaseBirthRadius), nobody, diseaseAfterSteps);
		expect(lingering.areas).toEqual([
			{
				id: 0,
				x: 50,
				y: 50,
				radius: diseaseMinRadius,
				species: 0,
				emptySteps: diseaseAfterSteps,
				bornStep: 0,
				pandemicStep: null,
			},
		]);

		const cleared = spreadDisease(lingering, nobody, 1);
		expect(cleared.areas).toEqual([]);
		expect(cleared.cost[50][50]).toBe(0);
	});

	it("keeps an area while any dot is inside it", () => {
		const next = spreadDisease(oneArea(diseaseBirthRadius, 7), [empty, crowd(1, 54, 54), empty], 1);
		expect(next.areas[0].emptySteps).toBe(0);
	});

	it("grows by at most one cell per step while more of its own dots are inside", () => {
		const packed = [crowd(4 * (diseaseCrowd + 1), 50, 50), empty, empty];
		const once = spreadDisease(oneArea(diseaseBirthRadius), packed, 1);
		expect(once.areas[0].radius).toBeCloseTo(diseaseBirthRadius + 1);
		expect(once.cost[57][50]).toBeGreaterThan(0);

		const grown = run(once, packed, 20);
		expect(grown.areas[0].radius).toBe(diseaseMaxRadius);
		expect(grown.cost[50 + diseaseMaxRadius][50]).toBeCloseTo(diseaseHpAtEdge);
		expect(grown.cost[51 + diseaseMaxRadius][50]).toBe(0);
	});

	it("shrinks by at most one cell per step once its own dots leave or die", () => {
		const once = spreadDisease(oneArea(diseaseMaxRadius), nobody, 1);
		expect(once.areas[0].radius).toBe(diseaseMaxRadius - 1);
		expect(once.cost[50 + diseaseMaxRadius][50]).toBe(0);
	});

	it("turns into a pandemic at pandemicRadius and keeps that step as it shrinks", () => {
		const packed = [crowd(4 * (diseaseCrowd + 1), 50, 50), empty, empty];
		const small = spreadDisease(oneArea(pandemicRadius - 2), packed, 1);
		expect(small.areas[0].pandemicStep).toBeNull();

		const big = spreadDisease(small, packed, 2);
		expect(big.areas[0].radius).toBe(pandemicRadius);
		expect(big.areas[0].pandemicStep).toBe(2);

		const shrunk = spreadDisease(big, [empty, crowd(1, 50, 50), empty], 3);
		expect(shrunk.areas[0].radius).toBeLessThan(pandemicRadius);
		expect(shrunk.areas[0].pandemicStep).toBe(2);
	});

	it("doesn't grow for another species' dots", () => {
		const others = [empty, crowd(4 * (diseaseCrowd + 1), 50, 50), empty];
		const next = spreadDisease(oneArea(diseaseBirthRadius), others, 1);
		expect(next.areas[0].radius).toBeCloseTo(diseaseBirthRadius - 1);
	});

	it("never starts a new area inside an existing one", () => {
		const nearby = [crowd(diseaseCrowd + 1, 52, 50), empty, empty];
		const disease = run(oneArea(diseaseBirthRadius), nearby, diseaseAfterSteps + 1);
		expect(disease.areas).toHaveLength(1);
		expect(disease.crowdedSteps[cell(52, 50)]).toBe(0);
		expect(disease.crowdedSteps[cell(58, 50)]).toBe(0);
	});

	it("gives each new area its own id and keeps it from step to step", () => {
		const born = run(emptyDisease(), crowded, diseaseAfterSteps + 1);
		const ids = born.areas.map((a) => a.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(born.nextId).toBe(Math.max(...ids) + 1);

		const later = spreadDisease(born, crowded, 1);
		expect(later.areas.slice(0, ids.length).map((a) => a.id)).toEqual(ids);
	});

	it("leaves the previous disease alone", () => {
		const before = run(emptyDisease(), crowded, 3);
		const counter = before.crowdedSteps[cell(50, 50)];
		spreadDisease(before, crowded, 1);
		expect(before.crowdedSteps[cell(50, 50)]).toBe(counter);
	});
});
