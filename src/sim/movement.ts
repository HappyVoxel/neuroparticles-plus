import { gridHeight, gridWidth, matureAge, oldAge, outputSize } from "./config";

/**
 * Network output index → move. 0–8 step to a neighbor: 0 NW, 1 N, 2 NE, 3 W, 4 stay, 5 E, 6 SW,
 * 7 S, 8 SE. 9–16 are knight jumps to the in-between directions: 9 NNW, 10 NNE, 11 WNW, 12 ENE,
 * 13 WSW, 14 ESE, 15 SSW, 16 SSE.
 */
export type Move = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export const stayMove: Move = 4;

/** Moves 0 to `stepMoves - 1` go at most one cell; the rest are knight jumps. */
export const stepMoves = 9;

const offsets: readonly (readonly [dx: number, dy: number])[] = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[0, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1],
	[-1, -2],
	[1, -2],
	[-2, -1],
	[2, -1],
	[-2, 1],
	[2, 1],
	[-1, 2],
	[1, 2],
];

/**
 * Reflects a coordinate up to two cells past a wall back inside the grid: -1 → 1, -2 → 2,
 * size → size - 2, size + 1 → size - 3.
 */
export function bounce(v: number, size: number): number {
	if (v < 0) return -v;
	if (v >= size) return 2 * (size - 1) - v;
	return v;
}

/** True when the move steps past an edge of the grid, so `moveBy` bounces it back. */
export function hitsWall(x: number, y: number, move: Move): boolean {
	const [dx, dy] = offsets[move];
	return x + dx < 0 || x + dx >= gridWidth || y + dy < 0 || y + dy >= gridHeight;
}

/** How many moves, from 0, an agent this old may pick: young and old ones can't knight-jump. */
export function moveCount(lifetime: number): number {
	return lifetime < matureAge || lifetime >= oldAge ? stepMoves : outputSize;
}

export function moveBy(x: number, y: number, move: Move): { x: number; y: number } {
	const [dx, dy] = offsets[move];
	return { x: bounce(x + dx, gridWidth), y: bounce(y + dy, gridHeight) };
}

/** Where to draw an agent `t` (0–1) of the way through its move from `prev` to `cur`. */
export function slide(prev: number, cur: number, t: number): number {
	return prev + (cur - prev) * t;
}
