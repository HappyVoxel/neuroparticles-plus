import { describe, expect, it } from "vitest";
import { gridHeight, gridWidth, inputSize, visionCells, wallSense } from "./config";
import { buildField, senseAt } from "./field";
import type { Agent } from "./types";

const at = (x: number, y: number): Agent => ({
	genome: [],
	hp: 1,
	x,
	y,
	prevX: x,
	prevY: y,
	lifetime: 0,
});

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
	const cell = (dx: number, dy: number) => visionCells.findIndex(([x, y]) => x === dx && y === dy);

	it("returns the view row by row with species interleaved per cell", () => {
		const red = buildField([at(50, 50)]);
		const green = buildField([at(51, 50)]); // one to the east
		const blue = buildField([at(50, 49)]); // one to the north
		const input = senseAt([red, green, blue], 50, 50);

		expect(input).toHaveLength(inputSize);
		expect(input[cell(0, 0) * 3 + 0]).toBe(1);
		expect(input[cell(1, 0) * 3 + 1]).toBe(1);
		expect(input[cell(0, -1) * 3 + 2]).toBe(1);
		expect(input.reduce((a, b) => a + b, 0)).toBe(3);
	});

	it("sees a round view of 121 cells, without the corners of the square around it", () => {
		const red = buildField([at(56, 50), at(50, 44), at(54, 54)]); // 6 E, 6 N, 4 SE
		const green = buildField([at(57, 50), at(55, 55), at(55, 54)]); // all out of view
		const input = senseAt([red, green, buildField([])], 50, 50);

		expect(visionCells).toHaveLength(121);
		expect(input).toHaveLength(inputSize);
		expect(input[cell(6, 0) * 3]).toBe(1);
		expect(input[cell(0, -6) * 3]).toBe(1);
		expect(input[cell(4, 4) * 3]).toBe(1);
		expect(input.reduce((a, b) => a + b, 0)).toBe(3);
	});

	it("reads cells outside the grid as a wall on the first channel only", () => {
		const red = buildField([at(gridWidth - 1, 0)]);
		const empty = buildField([]);
		const input = senseAt([red, empty, empty], 0, 0);
		expect(input.slice(cell(-1, 0) * 3, cell(-1, 0) * 3 + 3)).toEqual([wallSense, 0, 0]);
		expect(input.slice(cell(0, -1) * 3, cell(0, -1) * 3 + 3)).toEqual([wallSense, 0, 0]);
		expect(input[cell(1, 1) * 3]).toBe(0);
		expect(input).toHaveLength(inputSize);
	});
});
