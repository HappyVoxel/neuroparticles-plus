import { describe, expect, it } from "vitest";
import { gridHeight, gridWidth, inputSize, visionRadius } from "./config";
import { buildField, senseAt } from "./field";
import type { Agent } from "./types";

const at = (x: number, y: number): Agent => ({ genome: [], hp: 1, x, y, lifetime: 0 });

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
	const side = 2 * visionRadius + 1;
	const cell = (dx: number, dy: number) => (dy + visionRadius) * side + (dx + visionRadius);

	it("returns the window row by row with species interleaved per cell", () => {
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

	it("sees across the wrapped edge", () => {
		const red = buildField([at(gridWidth - 1, 0)]);
		const empty = buildField([]);
		const input = senseAt([red, empty, empty], 0, 0);
		expect(input[cell(-1, 0) * 3]).toBe(1);
	});
});
