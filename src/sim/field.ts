import { diseaseHpAtCenter, gridHeight, gridWidth, visionCells, wallSense } from "./config";
import type { Agent, Field } from "./types";

export function buildField(agents: readonly Agent[]): Field {
	const field = Array.from({ length: gridWidth }, () => new Int8Array(gridHeight));
	for (const { x, y } of agents) {
		field[x][y]++;
	}
	return field;
}

/**
 * The network input for an agent at (x, y): the round view around it (`visionCells`), row by
 * row, with the species counts and the disease cost interleaved per cell — [R, G, B, D, ...].
 * D is the cell's cost ÷ `diseaseHpAtCenter`: 0 outside disease, up to 1 at an area's center.
 * Cells outside the grid read `wallSense` on the first channel and 0 on the others.
 */
export function senseAt(
	fields: readonly Field[],
	diseaseCost: readonly Float32Array[],
	x: number,
	y: number,
): number[] {
	const input = new Array<number>(visionCells.length * (fields.length + 1));
	let k = 0;
	for (let c = 0; c < visionCells.length; c++) {
		const xx = x + visionCells[c][0];
		const yy = y + visionCells[c][1];
		if (xx < 0 || xx >= gridWidth || yy < 0 || yy >= gridHeight) {
			for (let s = 0; s < fields.length; s++) input[k++] = s === 0 ? wallSense : 0;
			input[k++] = 0;
		} else {
			for (let s = 0; s < fields.length; s++) input[k++] = fields[s][xx][yy];
			input[k++] = diseaseCost[xx][yy] / diseaseHpAtCenter;
		}
	}
	return input;
}
