import { describe, expect, it } from "vitest";
import {
	diseaseAfterSteps,
	diseaseCrowd,
	diseaseHpAtCenter,
	diseaseHpAtEdge,
	gridHeight,
	visionRadiusSquared,
} from "./config";
import { circleCounts, diseaseCostAt, emptyDisease, spreadDisease } from "./disease";
import { buildField } from "./field";
import type { Agent, Disease, Field } from "./types";

const at = (x: number, y: number): Agent => ({
	genome: [],
	hp: 1,
	x,
	y,
	prevX: x,
	prevY: y,
	lifetime: 0,
});

const crowd = (n: number, x: number, y: number): Field =>
	buildField(Array.from({ length: n }, () => at(x, y)));

const empty = buildField([]);
const cell = (x: number, y: number): number => x * gridHeight + y;

function run(disease: Disease, fields: readonly Field[], steps: number): Disease {
	let next = disease;
	for (let s = 0; s < steps; s++) next = spreadDisease(next, fields);
	return next;
}

describe("diseaseCostAt", () => {
	it("costs the most on the center and the least at the edge", () => {
		expect(diseaseCostAt(0)).toBe(diseaseHpAtCenter);
		expect(diseaseCostAt(visionRadiusSquared)).toBeCloseTo(diseaseHpAtEdge);
		expect(diseaseCostAt(9)).toBeLessThan(diseaseCostAt(4));
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
});

describe("spreadDisease", () => {
	const crowded = [crowd(diseaseCrowd + 1, 50, 50), empty, empty];

	it("turns a crowded circle into an area only after it stays crowded long enough", () => {
		const before = run(emptyDisease(), crowded, diseaseAfterSteps);
		expect(before.areas).toEqual([]);
		expect(before.crowdedSteps[cell(50, 50)]).toBe(diseaseAfterSteps);

		const after = spreadDisease(before, crowded);
		expect(after.areas).toContainEqual({ x: 50, y: 50, species: 0, emptySteps: 0 });
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
		expect(disease.areas).toContainEqual({ x: 50, y: 50, species: 1, emptySteps: 0 });
	});

	it("starts counting over once the crowd leaves", () => {
		const half = run(emptyDisease(), crowded, 50);
		expect(spreadDisease(half, [empty, empty, empty]).crowdedSteps[cell(50, 50)]).toBe(0);
	});

	it("uses the worst cost where areas overlap, never the sum", () => {
		const disease = run(emptyDisease(), crowded, diseaseAfterSteps + 1);
		expect(disease.areas.length).toBeGreaterThan(1);
		let worst = 0;
		for (const column of disease.cost) for (const c of column) worst = Math.max(worst, c);
		expect(worst).toBe(diseaseHpAtCenter);
	});

	it("clears an area once it has stayed empty long enough", () => {
		const one: Disease = {
			...emptyDisease(),
			areas: [{ x: 50, y: 50, species: 0, emptySteps: 0 }],
		};
		const nobody = [empty, empty, empty];
		const lingering = run(one, nobody, diseaseAfterSteps);
		expect(lingering.areas).toEqual([{ x: 50, y: 50, species: 0, emptySteps: diseaseAfterSteps }]);

		const cleared = spreadDisease(lingering, nobody);
		expect(cleared.areas).toEqual([]);
		expect(cleared.cost[50][50]).toBe(0);
	});

	it("keeps an area while any dot is inside it", () => {
		const one: Disease = {
			...emptyDisease(),
			areas: [{ x: 50, y: 50, species: 0, emptySteps: 7 }],
		};
		const next = spreadDisease(one, [empty, crowd(1, 54, 54), empty]);
		expect(next.areas).toEqual([{ x: 50, y: 50, species: 0, emptySteps: 0 }]);
	});

	it("leaves the previous disease alone", () => {
		const before = run(emptyDisease(), crowded, 3);
		const counter = before.crowdedSteps[cell(50, 50)];
		spreadDisease(before, crowded);
		expect(before.crowdedSteps[cell(50, 50)]).toBe(counter);
	});
});
