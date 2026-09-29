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

/** Wraps a coordinate onto the torus. Works for anything down to -size. */
export function wrap(v: number, size: number): number {
	return (v + size) % size;
}

export function moveBy(x: number, y: number, move: Move): { x: number; y: number } {
	const [dx, dy] = offsets[move];
	return { x: wrap(x + dx, gridWidth), y: wrap(y + dy, gridHeight) };
}

/**
 * Where to draw an agent `t` (0–1) of the way through its move from `prev` to `cur`.
 * A move over the wrapped edge snaps to `cur` instead of sliding across the whole grid.
 */
export function slide(prev: number, cur: number, t: number): number {
	return Math.abs(cur - prev) > 1 ? cur : prev + (cur - prev) * t;
}
