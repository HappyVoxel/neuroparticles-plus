import { gridHeight } from "./config";
import type { Agent, DeathCause, Species } from "./types";

export interface Capture {
	/** Prey that die this step, each with the hunters that caught it. */
	caught: ReadonlyMap<Agent, DeathCause>;
	/** HP each hunter takes from the prey it caught. */
	gain: ReadonlyMap<Agent, number>;
}

/** Index of the species that species `i` of `n` catches: the next one around the cycle. */
export function preyOf(i: number, n: number): number {
	return (i + 1) % n;
}

/**
 * Who gets caught this step. A dot sharing a cell with hunters (the species before its own) dies,
 * and the hunters on that cell split its HP equally. Every species is read from the same
 * snapshot, so a dot caught this step still catches.
 */
export function capture(species: readonly Species[]): Capture {
	const caught = new Map<Agent, DeathCause>();
	const gain = new Map<Agent, number>();
	const n = species.length;
	for (let i = 0; i < n; i++) {
		const hunters = new Map<number, Agent[]>();
		for (const hunter of species[i].agents) {
			const cell = hunter.x * gridHeight + hunter.y;
			const onCell = hunters.get(cell);
			if (onCell) onCell.push(hunter);
			else hunters.set(cell, [hunter]);
		}
		for (const prey of species[preyOf(i, n)].agents) {
			const onCell = hunters.get(prey.x * gridHeight + prey.y);
			if (!onCell) continue;
			caught.set(prey, {
				kind: "caught",
				by: species[i].id,
				killers: onCell.map((hunter) => hunter.id),
			});
			const share = prey.hp / onCell.length;
			for (const hunter of onCell) gain.set(hunter, (gain.get(hunter) ?? 0) + share);
		}
	}
	return { caught, gain };
}
