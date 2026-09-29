import { gridHeight, gridWidth } from "./config";

/** Network output index → move: 0 NW, 1 N, 2 NE, 3 W, 4 stay, 5 E, 6 SW, 7 S, 8 SE. */
export type Move = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const stayMove: Move = 4;

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
];

/** Reflects a coordinate one step past a wall back inside the grid: -1 → 1, size → size - 2. */
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

export function moveBy(x: number, y: number, move: Move): { x: number; y: number } {
	const [dx, dy] = offsets[move];
	return { x: bounce(x + dx, gridWidth), y: bounce(y + dy, gridHeight) };
}

/** Where to draw an agent `t` (0–1) of the way through its move from `prev` to `cur`. */
export function slide(prev: number, cur: number, t: number): number {
	return prev + (cur - prev) * t;
}
