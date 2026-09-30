import { allTopDots, hallOfFameSize } from "./config";
import type { Agent, DeadAgent, HallOfFame, Ranking, Sim, TopDotsFilter } from "./types";

/** A dot, living or dead, with the index of its species in `Sim.species`. */
export interface DotRef {
	species: number;
	agent: Agent | DeadAgent;
}

export function isDead(agent: Agent | DeadAgent): agent is DeadAgent {
	return "diedStep" in agent;
}

export function emptyHallOfFame(): HallOfFame {
	return { kills: [], lifetime: [] };
}

/** Higher first on the ranking, then on the other one. */
function compare(ranking: Ranking): (a: Agent, b: Agent) => number {
	const other: Ranking = ranking === "kills" ? "lifetime" : "kills";
	return (a, b) => b[ranking] - a[ranking] || b[other] - a[other];
}

/** Adds the dead to both rankings and keeps the best `hallOfFameSize` of each. */
export function addToHallOfFame(hall: HallOfFame, dead: readonly DeadAgent[]): HallOfFame {
	if (dead.length === 0) return hall;
	const best = (ranking: Ranking) =>
		[...hall[ranking], ...dead].sort(compare(ranking)).slice(0, hallOfFameSize);
	return { kills: best("kills"), lifetime: best("lifetime") };
}

/** The dot with this id: living, died on the last step, or in a hall of fame; null otherwise. */
export function findDot(sim: Sim, id: number): DotRef | null {
	const match = (a: Agent) => a.id === id;
	for (let species = 0; species < sim.species.length; species++) {
		const { agents, lastDeaths, hallOfFame } = sim.species[species];
		const agent =
			agents.find(match) ??
			lastDeaths.find(match) ??
			hallOfFame.kills.find(match) ??
			hallOfFame.lifetime.find(match);
		if (agent) return { species, agent };
	}
	return null;
}

/**
 * The best `n` dots on one ranking among those `filter` lets through (every species, living and
 * dead, by default). Filtering comes before the cut, so hidden dots never leave a slot empty.
 */
export function topDots(
	sim: Sim,
	ranking: Ranking,
	n: number,
	filter: TopDotsFilter = allTopDots,
): DotRef[] {
	const all: DotRef[] = [];
	sim.species.forEach((s, species) => {
		if (!filter.species[species]) return;
		for (const agent of s.agents) all.push({ species, agent });
		if (!filter.dead) return;
		for (const agent of s.hallOfFame[ranking]) all.push({ species, agent });
	});
	const order = compare(ranking);
	return all.sort((a, b) => order(a.agent, b.agent)).slice(0, n);
}

/** The living dot nearest to a cell, within `maxCells`; null when none is that close. */
export function nearestDot(sim: Sim, x: number, y: number, maxCells: number): DotRef | null {
	let best: DotRef | null = null;
	let bestDistance = maxCells * maxCells;
	for (let species = 0; species < sim.species.length; species++) {
		for (const agent of sim.species[species].agents) {
			const distance = (agent.x - x) ** 2 + (agent.y - y) ** 2;
			if (distance < bestDistance || (best === null && distance === bestDistance)) {
				best = { species, agent };
				bestDistance = distance;
			}
		}
	}
	return best;
}
