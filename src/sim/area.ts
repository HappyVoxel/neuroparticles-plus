import { gridHeight, gridWidth } from "./config";
import type { Agent } from "./types";

/** A box of grid cells; the cells on both corners are inside it. */
export interface Area {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export type Cell = readonly [x: number, y: number];

const clamp = (v: number, max: number): number => Math.min(Math.max(v, 0), max);

/** The box between two cells given in any order, cut to the grid. */
export function areaFromCorners([ax, ay]: Cell, [bx, by]: Cell): Area {
	return {
		x0: clamp(Math.min(ax, bx), gridWidth - 1),
		y0: clamp(Math.min(ay, by), gridHeight - 1),
		x1: clamp(Math.max(ax, bx), gridWidth - 1),
		y1: clamp(Math.max(ay, by), gridHeight - 1),
	};
}

/** Agents whose current cell is inside the area. */
export function agentsIn(agents: readonly Agent[], { x0, y0, x1, y1 }: Area): Agent[] {
	return agents.filter(({ x, y }) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
}
