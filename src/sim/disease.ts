import {
	diseaseAfterSteps,
	diseaseCrowd,
	diseaseHpAtCenter,
	diseaseHpAtEdge,
	gridHeight,
	gridWidth,
	visionCells,
	visionRadiusSquared,
} from "./config";
import type { Disease, DiseaseArea, Field } from "./types";

const cellCount = gridWidth * gridHeight;

/** No areas, no crowd counted yet. */
export function emptyDisease(): Disease {
	return {
		areas: [],
		crowdedSteps: new Uint16Array(cellCount),
		cost: Array.from({ length: gridWidth }, () => new Float32Array(gridHeight)),
	};
}

/**
 * HP per step for a dot `distanceSquared` from an area's center: `diseaseHpAtCenter` on the center,
 * falling in a straight line with distance to `diseaseHpAtEdge` at the edge.
 */
export function diseaseCostAt(distanceSquared: number): number {
	const reach = Math.sqrt(distanceSquared / visionRadiusSquared);
	return diseaseHpAtCenter - (diseaseHpAtCenter - diseaseHpAtEdge) * reach;
}

// The cost of each cell in `visionCells` order, so a whole area is one pass over the view.
const costByCell = visionCells.map(([dx, dy]) => diseaseCostAt(dx * dx + dy * dy));

/** For every cell (`x * gridHeight + y`), how many of a field's agents stand in the circle around it. */
export function circleCounts(field: Field): Int16Array {
	const counts = new Int16Array(cellCount);
	for (let x = 0; x < gridWidth; x++) {
		const column = field[x];
		for (let y = 0; y < gridHeight; y++) {
			const n = column[y];
			if (n === 0) continue;
			for (let c = 0; c < visionCells.length; c++) {
				const xx = x + visionCells[c][0];
				const yy = y + visionCells[c][1];
				if (xx >= 0 && xx < gridWidth && yy >= 0 && yy < gridHeight)
					counts[xx * gridHeight + yy] += n;
			}
		}
	}
	return counts;
}

/** Each cell's cost is the worst of the areas covering it; overlapping areas don't add up. */
function costGrid(areas: readonly DiseaseArea[]): Float32Array[] {
	const cost = Array.from({ length: gridWidth }, () => new Float32Array(gridHeight));
	for (const { x, y } of areas) {
		for (let c = 0; c < visionCells.length; c++) {
			const xx = x + visionCells[c][0];
			const yy = y + visionCells[c][1];
			if (xx >= 0 && xx < gridWidth && yy >= 0 && yy < gridHeight) {
				cost[xx][yy] = Math.max(cost[xx][yy], costByCell[c]);
			}
		}
	}
	return cost;
}

/**
 * One step of disease, read from this step's fields (one per species). An area with no dot inside
 * for more than `diseaseAfterSteps` steps clears. A circle holding more than `diseaseCrowd` dots of
 * one species counts a crowded step; past `diseaseAfterSteps` in a row it becomes an area of the
 * species with the most dots in it. A circle that is already an area doesn't count.
 */
export function spreadDisease(disease: Disease, fields: readonly Field[]): Disease {
	// The biggest one-species crowd around each cell, which species it is, and every dot around it.
	const most = new Int16Array(cellCount);
	const mostSpecies = new Int8Array(cellCount);
	const total = new Int16Array(cellCount);
	for (let s = 0; s < fields.length; s++) {
		const counts = circleCounts(fields[s]);
		for (let i = 0; i < cellCount; i++) {
			total[i] += counts[i];
			if (counts[i] > most[i]) {
				most[i] = counts[i];
				mostSpecies[i] = s;
			}
		}
	}

	const areas: DiseaseArea[] = [];
	for (const area of disease.areas) {
		const emptySteps = total[area.x * gridHeight + area.y] > 0 ? 0 : area.emptySteps + 1;
		if (emptySteps <= diseaseAfterSteps) areas.push({ ...area, emptySteps });
	}
	let changed = areas.length !== disease.areas.length;

	const isArea = new Set(areas.map(({ x, y }) => x * gridHeight + y));
	const crowdedSteps = new Uint16Array(cellCount);
	for (let i = 0; i < cellCount; i++) {
		if (most[i] <= diseaseCrowd || isArea.has(i)) continue;
		const steps = disease.crowdedSteps[i] + 1;
		if (steps > diseaseAfterSteps) {
			const x = Math.floor(i / gridHeight);
			areas.push({ x, y: i - x * gridHeight, species: mostSpecies[i], emptySteps: 0 });
			changed = true;
		} else {
			crowdedSteps[i] = steps;
		}
	}

	return { areas, crowdedSteps, cost: changed ? costGrid(areas) : disease.cost };
}
