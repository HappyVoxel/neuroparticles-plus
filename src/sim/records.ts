import { allTopDots, hallOfFameSize } from "./config";
import type { Agent, DeadAgent, HallOfFame, Ranking, Sim, TopDotsFilter } from "./types";

/** A dot, living or dead, with the index of its species in `Sim.species`. */
export interface DotRef {
	species: number;
	agent: Agent | DeadAgent;
}

/** Works on a dot with or without its genome. */
export function isDead<T extends Omit<Agent, "genome"> | Omit<DeadAgent, "genome">>(
	agent: T,
): agent is Extract<T, { diedStep: number }> {
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
 * dead, by default), skipping dots at 0 on that ranking. Filtering comes before the cut, so
 * hidden dots never leave a slot empty. Ties keep species order, the living before the dead.
 * One pass that keeps the best `n` so far, so it can run every frame.
 */
export function topDots(
	sim: Sim,
	ranking: Ranking,
	n: number,
	filter: TopDotsFilter = allTopDots,
): DotRef[] {
	const order = compare(ranking);
	const best: DotRef[] = [];
	const offer = (species: number, agent: Agent | DeadAgent) => {
		if (agent[ranking] <= 0) return;
		let i = best.length;
		while (i > 0 && order(agent, best[i - 1].agent) < 0) i--;
		if (i >= n) return;
		best.splice(i, 0, { species, agent });
		if (best.length > n) best.pop();
	};
	for (let species = 0; species < sim.species.length; species++) {
		if (!filter.species[species]) continue;
		const { agents, hallOfFame } = sim.species[species];
		for (let i = 0; i < agents.length; i++) offer(species, agents[i]);
		if (!filter.dead) continue;
		const dead = hallOfFame[ranking];
		for (let i = 0; i < dead.length; i++) offer(species, dead[i]);
	}
	return best;
}

/**
 * Per species, the id of its living dot highest on `ranking`, a tie going to the other ranking;
 * null while no living dot of that species is above 0 on it. One pass, no sort, so it can run
 * every frame.
 */
export function leaderIds(sim: Sim, ranking: Ranking): (number | null)[] {
	const order = compare(ranking);
	return sim.species.map(({ agents }) => {
		let best: Agent | null = null;
		for (let i = 0; i < agents.length; i++) {
			const agent = agents[i];
			if (agent[ranking] > 0 && (best === null || order(agent, best) < 0)) best = agent;
		}
		return best?.id ?? null;
	});
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
