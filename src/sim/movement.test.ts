import { describe, expect, it } from "vitest";
import { gridHeight, gridWidth } from "./config";
import { bounce, hitsWall, moveBy, slide } from "./movement";

describe("bounce", () => {
	it("reflects a step past either wall back inside", () => {
		expect(bounce(-1, 200)).toBe(1);
		expect(bounce(200, 200)).toBe(198);
		expect(bounce(57, 200)).toBe(57);
		expect(bounce(0, 200)).toBe(0);
		expect(bounce(199, 200)).toBe(199);
	});

	it("reflects a jump two cells past either wall back inside", () => {
		expect(bounce(-2, 200)).toBe(2);
		expect(bounce(201, 200)).toBe(197);
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
		[9, -1, -2],
		[10, 1, -2],
		[11, -2, -1],
		[12, 2, -1],
		[13, -2, 1],
		[14, 2, 1],
		[15, -1, 2],
		[16, 1, 2],
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

	it("bounces a knight jump off a wall", () => {
		// ENE from the east wall: two cells back W, one cell N.
		expect(moveBy(gridWidth - 1, 10, 12)).toEqual({ x: gridWidth - 3, y: 9 });
		// ENE from one cell off the east wall: one cell E, bounce back one cell W.
		expect(moveBy(gridWidth - 2, 10, 12)).toEqual({ x: gridWidth - 2, y: 9 });
		// NNW from the north-west corner turns into SSE.
		expect(moveBy(0, 0, 9)).toEqual({ x: 1, y: 2 });
	});
});

describe("hitsWall", () => {
	it("is true when the move steps past an edge", () => {
		expect(hitsWall(0, 10, 3)).toBe(true); // W at the west wall
		expect(hitsWall(gridWidth - 1, 10, 2)).toBe(true); // NE at the east wall
		expect(hitsWall(10, 0, 1)).toBe(true); // N at the north wall
		expect(hitsWall(10, gridHeight - 1, 7)).toBe(true); // S at the south wall
		expect(hitsWall(gridWidth - 2, 10, 12)).toBe(true); // ENE one cell off the east wall
		expect(hitsWall(10, 1, 10)).toBe(true); // NNE one cell off the north wall
	});

	it("is false for moves that stay on the grid", () => {
		expect(hitsWall(0, 10, 5)).toBe(false); // E, away from the west wall
		expect(hitsWall(0, 10, 1)).toBe(false); // N, along the west wall
		expect(hitsWall(0, 0, 4)).toBe(false); // stay in the corner
		expect(hitsWall(10, 10, 0)).toBe(false);
		expect(hitsWall(gridWidth - 3, 10, 12)).toBe(false); // ENE two cells off the east wall
		expect(hitsWall(1, 10, 10)).toBe(false); // NNE, along the west wall
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
