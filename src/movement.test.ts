import { describe, expect, it } from "vitest";
import { gridHeight, gridWidth } from "./config";
import { moveBy, wrap } from "./movement";

describe("wrap", () => {
	it("wraps both edges of the torus", () => {
		expect(wrap(-1, 200)).toBe(199);
		expect(wrap(200, 200)).toBe(0);
		expect(wrap(57, 200)).toBe(57);
	});
});

describe("moveBy", () => {
	it.each([
		[0, -1, -1],
		[1, 0, -1],
		[2, 1, -1],
		[3, -1, 0],
		[4, 0, 0],
		[5, 1, 0],
		[6, -1, 1],
		[7, 0, 1],
		[8, 1, 1],
	] as const)("move %i shifts by (%i, %i)", (move, dx, dy) => {
		expect(moveBy(10, 10, move)).toEqual({ x: 10 + dx, y: 10 + dy });
	});

	it("wraps across the corner", () => {
		expect(moveBy(0, 0, 0)).toEqual({ x: gridWidth - 1, y: gridHeight - 1 });
		expect(moveBy(gridWidth - 1, gridHeight - 1, 8)).toEqual({ x: 0, y: 0 });
	});
});
