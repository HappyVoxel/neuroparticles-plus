import {
	diseaseAfterSteps,
	diseaseCrowd,
	diseaseHpAtCenter,
	diseaseHpAtEdge,
	diseaseMaxRadius,
	diseaseMinRadius,
	gridHeight,
	gridWidth,
	pandemicRadius,
	visionCells,
	visionRadius,
	visionRadiusSquared,
} from "./config";
import { clamp } from "./math";
import type { Disease, DiseaseArea, Field } from "./types";

const cellCount = gridWidth * gridHeight;

/** No areas, no crowd counted yet. */
export function emptyDisease(): Disease {
	return {
		areas: [],
		nextId: 0,
		crowdedSteps: new Uint16Array(cellCount),
		cost: costGrid([]),
	};
}

/** A new area's radius: the view's. */
export const diseaseBirthRadius = visionRadius;

/** Whether a cell `distanceSquared` from a center is inside a circle of `radius`. */
function inside(distanceSquared: number, radius: number): boolean {
	// The tolerance keeps the rim cells when `radius` is a square root, e.g. `diseaseBirthRadius`.
	return distanceSquared <= radius * radius + 1e-9;
}

/**
 * HP per step for a dot `distanceSquared` from the center of an area of `radius`:
 * `diseaseHpAtCenter` on the center, falling in a straight line with distance to `diseaseHpAtEdge`
 * at the edge.
 */
export function diseaseCostAt(distanceSquared: number, radius: number): number {
	const reach = Math.min(1, Math.sqrt(distanceSquared) / radius);
	return diseaseHpAtCenter - (diseaseHpAtCenter - diseaseHpAtEdge) * reach;
}

/**
 * The radius that holds `ownDots` at the density an area is born with (`diseaseCrowd + 1` dots in
 * the view), kept between `diseaseMinRadius` and `diseaseMaxRadius`.
 */
export function targetRadius(ownDots: number): number {
	const radius = Math.sqrt((visionRadiusSquared * ownDots) / (diseaseCrowd + 1));
	return Math.min(diseaseMaxRadius, Math.max(diseaseMinRadius, radius));
}

/**
 * For every cell (`x * gridHeight + y`), how many of a field's agents stand in the circle around it,
 * leaving out agents on cells where `cost` is above 0.
 */
export function circleCounts(field: Field, cost?: readonly Float32Array[]): Int16Array {
	const counts = new Int16Array(cellCount);
	for (let x = 0; x < gridWidth; x++) {
		const column = field[x];
		for (let y = 0; y < gridHeight; y++) {
			const n = column[y];
			if (n === 0 || (cost && cost[x][y] > 0)) continue;
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

/** How many of a field's agents stand inside an area. */
function countInside(field: Field, { x, y, radius }: DiseaseArea): number {
	const reach = Math.floor(radius);
	let n = 0;
	for (let dx = -reach; dx <= reach; dx++) {
		const xx = x + dx;
		if (xx < 0 || xx >= gridWidth) continue;
		const column = field[xx];
		for (let dy = -reach; dy <= reach; dy++) {
			const yy = y + dy;
			if (yy >= 0 && yy < gridHeight && inside(dx * dx + dy * dy, radius)) n += column[yy];
		}
	}
	return n;
}

/** Each cell's cost is the worst of the areas covering it; overlapping areas don't add up. */
export function costGrid(areas: readonly DiseaseArea[]): Float32Array[] {
	const cost = Array.from({ length: gridWidth }, () => new Float32Array(gridHeight));
	for (const { x, y, radius } of areas) {
		const reach = Math.floor(radius);
		for (let dx = -reach; dx <= reach; dx++) {
			const xx = x + dx;
			if (xx < 0 || xx >= gridWidth) continue;
			for (let dy = -reach; dy <= reach; dy++) {
				const yy = y + dy;
				const distanceSquared = dx * dx + dy * dy;
				if (yy >= 0 && yy < gridHeight && inside(distanceSquared, radius)) {
					cost[xx][yy] = Math.max(cost[xx][yy], diseaseCostAt(distanceSquared, radius));
				}
			}
		}
	}
	return cost;
}

/**
 * Step `now` of disease, read from this step's fields (one per species). An area with no dot inside
 * for more than `diseaseAfterSteps` steps clears; otherwise its radius moves by at most one cell
 * toward `targetRadius` of its own species' dots inside. A circle holding more than `diseaseCrowd`
 * dots of one species counts a crowded step; past `diseaseAfterSteps` in a row it joins a crowd
 * that starts one area, centered on the crowd, of the species with the most dots in it. An area that reaches `pandemicRadius` is a pandemic from
 * then on and keeps that step in `pandemicStep`. Dots inside an area don't count toward a crowd, and a
 * cell inside an area doesn't count a crowded step, so areas don't pile up on one crowd.
 */
export function spreadDisease(disease: Disease, fields: readonly Field[], now: number): Disease {
	const areas: DiseaseArea[] = [];
	let changed = false;
	for (const area of disease.areas) {
		let own = 0;
		let all = 0;
		for (let s = 0; s < fields.length; s++) {
			const n = countInside(fields[s], area);
			all += n;
			if (s === area.species) own = n;
		}
		const emptySteps = all > 0 ? 0 : area.emptySteps + 1;
		if (emptySteps > diseaseAfterSteps) {
			changed = true;
			continue;
		}
		const radius = area.radius + clamp(targetRadius(own) - area.radius, -1, 1);
		if (radius !== area.radius) changed = true;
		const pandemicStep = area.pandemicStep ?? (radius >= pandemicRadius ? now : null);
		areas.push({ ...area, radius, emptySteps, pandemicStep });
	}
	const cost = changed ? costGrid(areas) : disease.cost;

	// The biggest one-species crowd outside disease around each cell, and which species it is.
	const most = new Int16Array(cellCount);
	const mostSpecies = new Int8Array(cellCount);
	for (let s = 0; s < fields.length; s++) {
		const counts = circleCounts(fields[s], cost);
		for (let i = 0; i < cellCount; i++) {
			if (counts[i] > most[i]) {
				most[i] = counts[i];
				mostSpecies[i] = s;
			}
		}
	}

	const kept = areas.length;
	let nextId = disease.nextId;
	const crowdedSteps = new Uint16Array(cellCount);
	// Cells crowded long enough to start an area, in scan order.
	const due: number[] = [];
	for (let x = 0; x < gridWidth; x++) {
		for (let y = 0; y < gridHeight; y++) {
			const i = x * gridHeight + y;
			if (most[i] <= diseaseCrowd || cost[x][y] > 0) continue;
			const steps = disease.crowdedSteps[i] + 1;
			if (steps > diseaseAfterSteps) due.push(i);
			else crowdedSteps[i] = steps;
		}
	}

	// One area per crowd: the most crowded due cell picks its species, the due cells of that
	// species near it are the crowd, and the area starts on their middle. Due cells it then covers
	// are used up.
	const seeds = [...due].sort((a, b) => most[b] - most[a]);
	const used = new Set<number>();
	const reachSquared = (2 * diseaseBirthRadius) ** 2;
	const distanceSquared = (a: number, bx: number, by: number) =>
		(Math.floor(a / gridHeight) - bx) ** 2 + ((a % gridHeight) - by) ** 2;
	for (const seed of seeds) {
		if (used.has(seed)) continue;
		const species = mostSpecies[seed];
		const sx = Math.floor(seed / gridHeight);
		const sy = seed % gridHeight;
		const crowd = due.filter(
			(i) =>
				!used.has(i) && mostSpecies[i] === species && distanceSquared(i, sx, sy) <= reachSquared,
		);
		let sumX = 0;
		let sumY = 0;
		for (const i of crowd) {
			sumX += Math.floor(i / gridHeight);
			sumY += i % gridHeight;
		}
		const x = Math.round(sumX / crowd.length);
		const y = Math.round(sumY / crowd.length);
		for (const i of crowd) used.add(i);
		for (const i of due) if (inside(distanceSquared(i, x, y), diseaseBirthRadius)) used.add(i);
		areas.push({
			id: nextId++,
			x,
			y,
			radius: diseaseBirthRadius,
			species,
			emptySteps: 0,
			bornStep: now,
			pandemicStep: null,
		});
	}

	return { areas, nextId, crowdedSteps, cost: areas.length > kept ? costGrid(areas) : cost };
}
