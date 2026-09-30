import { describe, expect, it } from "vitest";
import { diseaseLabelMs, diseaseLabelSizeRatio, pandemicRadius } from "@/sim/config";
import type { DiseaseArea } from "@/sim/types";
import { diseaseLabels } from "./disease-labels";

const area = (fields: Partial<DiseaseArea>): DiseaseArea => ({
	id: 0,
	x: 100,
	y: 100,
	radius: 6,
	species: 0,
	emptySteps: 0,
	bornStep: 10,
	pandemicStep: null,
	...fields,
});

// At 20 steps per second a label lives 50 steps.
const speed = 20;
const life = (speed * diseaseLabelMs) / 1000;
const texts = (areas: DiseaseArea[], step: number) =>
	diseaseLabels(areas, step, speed).map((l) => l.text);

describe("diseaseLabels", () => {
	it("shows Disease! from an area's birth for diseaseLabelMs at the current speed", () => {
		const born = [area({ bornStep: 10 })];
		expect(texts(born, 10)).toEqual(["Disease!"]);
		expect(texts(born, 10 + life - 1)).toEqual(["Disease!"]);
		expect(texts(born, 10 + life)).toEqual([]);
	});

	it("fades out over the last part of its life", () => {
		const born = [area({ bornStep: 10 })];
		expect(diseaseLabels(born, 10, speed)[0].opacity).toBe(1);
		expect(diseaseLabels(born, 10 + life - 1, speed)[0].opacity).toBeLessThan(0.1);
	});

	it("shows Pandemic! from the step it became one", () => {
		const small = [area({ bornStep: 10 })];
		expect(texts(small, 199)).toEqual([]);
		const big = [area({ bornStep: 10, pandemicStep: 200, radius: pandemicRadius })];
		expect(texts(big, 200)).toEqual(["Pandemic!"]);
		expect(texts(big, 200 + life)).toEqual([]);
	});

	it("sizes the label by the area's radius", () => {
		const [small] = diseaseLabels([area({ radius: 6 })], 10, speed);
		const [big] = diseaseLabels([area({ radius: 12 })], 10, speed);
		expect(small.size).toBe(6 * diseaseLabelSizeRatio);
		expect(big.size).toBe(2 * small.size);
	});

	it("shows one label for a burst of areas in one spot, of any species", () => {
		const burst = [area({ id: 1 }), area({ id: 2, x: 102 }), area({ id: 3, y: 103, species: 1 })];
		expect(diseaseLabels(burst, 10, speed).map((l) => l.key)).toEqual(["1-Disease!"]);
	});

	it("puts a pandemic ahead of the labels it overlaps", () => {
		const labels = diseaseLabels(
			[area({ id: 1 }), area({ id: 2, radius: pandemicRadius, pandemicStep: 10 })],
			10,
			speed,
		);
		expect(labels.map((l) => l.key)).toEqual(["2-Pandemic!"]);
	});

	it("leaves out a label that would sit right against another", () => {
		expect(texts([area({ id: 1 }), area({ id: 2, y: 106 })], 10)).toHaveLength(1);
	});

	it("labels areas far apart on their own", () => {
		expect(texts([area({ id: 1, x: 30 }), area({ id: 2, x: 170 })], 10)).toHaveLength(2);
	});

	it("keeps a label inside the grid next to a wall", () => {
		const [label] = diseaseLabels([area({ x: 199, y: 0 })], 10, speed);
		expect(label.x).toBeLessThan(199);
		expect(label.bottom).toBe(label.size);
	});
});
