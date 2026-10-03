import { feedSharePercent, gridHeight, matureAge } from "./config";
import { isNear } from "./evolution";
import type { Agent, DeathCause, Species } from "./types";

export interface Capture {
	/** Prey that die this step, each with the hunters that caught it. */
	caught: ReadonlyMap<Agent, DeathCause>;
	/** HP each hunter keeps from the prey it caught. */
	gain: ReadonlyMap<Agent, number>;
	/** HP each young dot gets from its parents' catches. */
	fed: ReadonlyMap<Agent, number>;
}

/** Index of the species that species `i` of `n` catches: the next one around the cycle. */
export function preyOf(i: number, n: number): number {
	return (i + 1) % n;
}

/**
 * Who gets caught this step. A dot sharing a cell with hunters (the species before its own) dies,
 * and the hunters on that cell split its HP equally. Every species is read from the same
 * snapshot, so a dot caught this step still catches. A hunter then feeds `feedSharePercent`% of
 * its catch to its own children younger than `matureAge` in its view and not caught, split equally.
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
				by: i,
				killers: onCell.map((hunter) => hunter.id),
			});
			const share = prey.hp / onCell.length;
			for (const hunter of onCell) gain.set(hunter, (gain.get(hunter) ?? 0) + share);
		}
	}
	return { caught, gain, fed: feed(species, caught, gain) };
}

/** Moves part of each hunter's `gain` to its young children in view; returns what each child gets. */
function feed(
	species: readonly Species[],
	caught: ReadonlyMap<Agent, DeathCause>,
	gain: Map<Agent, number>,
): Map<Agent, number> {
	const fed = new Map<Agent, number>();
	if (gain.size === 0) return fed;
	for (const { agents } of species) {
		const young = new Map<number, Agent[]>();
		for (const child of agents) {
			if (child.lifetime >= matureAge || child.parents === null || caught.has(child)) continue;
			for (const parent of child.parents) {
				const kids = young.get(parent);
				if (kids) kids.push(child);
				else young.set(parent, [child]);
			}
		}
		for (const hunter of agents) {
			const catchHp = gain.get(hunter);
			if (catchHp === undefined) continue;
			const kids = (young.get(hunter.id) ?? []).filter((child) => isNear(hunter, child));
			if (kids.length === 0) continue;
			const share = (catchHp * feedSharePercent) / 100;
			gain.set(hunter, catchHp - share);
			for (const child of kids) fed.set(child, (fed.get(child) ?? 0) + share / kids.length);
		}
	}
	return fed;
}
