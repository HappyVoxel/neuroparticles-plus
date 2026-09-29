import { gridHeight, gridWidth, visionRadius } from "./config";
import { wrap } from "./movement";
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
 */
export function senseAt(fields: readonly Field[], x: number, y: number): number[] {
	const input: number[] = [];
	for (let dy = -visionRadius; dy <= visionRadius; dy++) {
		const yy = wrap(y + dy, gridHeight);
		for (let dx = -visionRadius; dx <= visionRadius; dx++) {
			const xx = wrap(x + dx, gridWidth);
			for (const field of fields) input.push(field[xx][yy]);
		}
	}
	return input;
}
