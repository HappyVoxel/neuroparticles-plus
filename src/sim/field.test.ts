import { describe, expect, it } from "vitest";
import {
	diseaseHpAtCenter,
	gridHeight,
	gridWidth,
	inputSize,
	visionCells,
	wallSense,
} from "./config";
import { emptyDisease } from "./disease";
import { buildField, senseAt } from "./field";
import { spawn } from "./evolution";
import type { Agent } from "./types";

const at = (x: number, y: number): Agent => ({ ...spawn({ id: 0, genome: [] }, { x, y }), hp: 1 });

describe("buildField", () => {
	it("counts agents per cell", () => {
		const field = buildField([at(3, 4), at(3, 4), at(0, 0)]);
		expect(field).toHaveLength(gridWidth);
		expect(field[0]).toHaveLength(gridHeight);
		expect(field[3][4]).toBe(2);
		expect(field[0][0]).toBe(1);
		expect(field[4][3]).toBe(0);
	});
});

describe("senseAt", () => {
	const noDisease = emptyDisease().cost;
	const cell = (dx: number, dy: number) => visionCells.findIndex(([x, y]) => x === dx && y === dy);

	it("returns the view row by row with species and disease interleaved per cell", () => {
		const red = buildField([at(50, 50)]);
		const green = buildField([at(51, 50)]); // one to the east
		const blue = buildField([at(50, 49)]); // one to the north
		const input = senseAt([red, green, blue], noDisease, 50, 50);

		expect(input).toHaveLength(inputSize);
		expect(input[cell(0, 0) * 4 + 0]).toBe(1);
		expect(input[cell(1, 0) * 4 + 1]).toBe(1);
		expect(input[cell(0, -1) * 4 + 2]).toBe(1);
		expect(input.reduce((a, b) => a + b, 0)).toBe(3);
	});

	it("sees a round view of 121 cells, without the corners of the square around it", () => {
		const red = buildField([at(56, 50), at(50, 44), at(54, 54)]); // 6 E, 6 N, 4 SE
		const green = buildField([at(57, 50), at(55, 55), at(55, 54)]); // all out of view
		const input = senseAt([red, green, buildField([])], noDisease, 50, 50);

		expect(visionCells).toHaveLength(121);
		expect(input).toHaveLength(inputSize);
		expect(input[cell(6, 0) * 4]).toBe(1);
		expect(input[cell(0, -6) * 4]).toBe(1);
		expect(input[cell(4, 4) * 4]).toBe(1);
		expect(input.reduce((a, b) => a + b, 0)).toBe(3);
	});

	it("reads a cell's disease cost on the fourth channel, scaled to the center's", () => {
		const empty = buildField([]);
		const cost = emptyDisease().cost;
		cost[52][50] = diseaseHpAtCenter / 2;
		const input = senseAt([empty, empty, empty], cost, 50, 50);
		expect(input[cell(2, 0) * 4 + 3]).toBe(0.5);
		expect(input.reduce((a, b) => a + b, 0)).toBe(0.5);
	});

	it("reads cells outside the grid as a wall on the first channel only", () => {
		const red = buildField([at(gridWidth - 1, 0)]);
		const empty = buildField([]);
		const input = senseAt([red, empty, empty], noDisease, 0, 0);
		expect(input.slice(cell(-1, 0) * 4, cell(-1, 0) * 4 + 4)).toEqual([wallSense, 0, 0, 0]);
		expect(input.slice(cell(0, -1) * 4, cell(0, -1) * 4 + 4)).toEqual([wallSense, 0, 0, 0]);
		expect(input[cell(1, 1) * 4]).toBe(0);
		expect(input).toHaveLength(inputSize);
	});
});
