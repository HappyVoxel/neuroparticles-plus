import { gridHeight, gridWidth, visionRadius, wallSense } from "./config";
import type { Agent, Field } from "./types";

export function buildField(agents: readonly Agent[]): Field {
	const field = Array.from({ length: gridWidth }, () => new Int8Array(gridHeight));
	for (const { x, y } of agents) {
		field[x][y]++;
	}
	return field;
}

/**
 * The network input for an agent at (x, y): the window around it, row by row,
 * with the species counts interleaved per cell — [R, G, B, R, G, B, ...].
 * Cells outside the grid read `wallSense` on the first channel and 0 on the others.
 */
export function senseAt(fields: readonly Field[], x: number, y: number): number[] {
	const input: number[] = [];
	for (let dy = -visionRadius; dy <= visionRadius; dy++) {
		const yy = y + dy;
		const rowOutside = yy < 0 || yy >= gridHeight;
		for (let dx = -visionRadius; dx <= visionRadius; dx++) {
			const xx = x + dx;
			if (rowOutside || xx < 0 || xx >= gridWidth) {
				for (let s = 0; s < fields.length; s++) input.push(s === 0 ? wallSense : 0);
			} else {
				for (const field of fields) input.push(field[xx][yy]);
			}
		}
	}
	return input;
}
