import { describe, expect, it } from "vitest";
import { gridHeight, gridWidth } from "./config";
import { bounce, moveBy, slide } from "./movement";

describe("bounce", () => {
	it("reflects a step past either wall back inside", () => {
		expect(bounce(-1, 200)).toBe(1);
		expect(bounce(200, 200)).toBe(198);
		expect(bounce(57, 200)).toBe(57);
		expect(bounce(0, 200)).toBe(0);
		expect(bounce(199, 200)).toBe(199);
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

	it("bounces off a corner on both axes", () => {
		expect(moveBy(0, 0, 0)).toEqual({ x: 1, y: 1 });
		expect(moveBy(gridWidth - 1, gridHeight - 1, 8)).toEqual({
			x: gridWidth - 2,
			y: gridHeight - 2,
		});
	});

	it("bounces only the axis that hits the wall", () => {
		// NE against the east wall turns into NW.
		expect(moveBy(gridWidth - 1, 10, 2)).toEqual({ x: gridWidth - 2, y: 9 });
		// S against the south wall turns into N.
		expect(moveBy(10, gridHeight - 1, 7)).toEqual({ x: 10, y: gridHeight - 2 });
	});
});

describe("slide", () => {
	it("goes from the previous cell to the current one", () => {
		expect(slide(10, 11, 0)).toBe(10);
		expect(slide(10, 11, 0.25)).toBe(10.25);
		expect(slide(10, 9, 0.5)).toBe(9.5);
		expect(slide(10, 11, 1)).toBe(11);
	});

	it("stays put when the agent did not move", () => {
		expect(slide(10, 10, 0.5)).toBe(10);
	});
});
