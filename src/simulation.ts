import { populationSize, speciesDefs } from "./config";
import { ageAndCull, breed, spawn } from "./evolution";
import { buildField, senseAt } from "./field";
import { moveBy } from "./movement";
import { evaluate, pickMove, randomGenome } from "./network";
import type { Agent, Field, MutationParams, Sim, Species } from "./types";

export function createSim(mutation: MutationParams): Sim {
	const species = speciesDefs.map((def): Species => {
		const agents = Array.from({ length: populationSize }, () => spawn(randomGenome()));
		return { ...def, agents, field: buildField(agents) };
	});
	return { species, step: 0, mutation };
}

function think(agent: Agent, fields: readonly Field[]): Agent {
	const move = pickMove(evaluate(senseAt(fields, agent.x, agent.y), agent.genome));
	return { ...agent, ...moveBy(agent.x, agent.y, move) };
}

/**
 * One tick: every species ages, dies and breeds, then every agent moves, then the fields are
 * rebuilt. All of it reads the fields from the previous tick, so moves don't see each other.
 */
export function step(sim: Sim): Sim {
	const { species, mutation } = sim;
	const n = species.length;
	const fields = species.map((s) => s.field);

	const next = species.map((self, i) => {
		const enemies = species[(i + n - 1) % n];
		const prey = species[(i + 1) % n];
		const survivors = ageAndCull(self, enemies, prey);
		const agents = [...survivors, ...breed(survivors, mutation)].map((a) => think(a, fields));
		return { ...self, agents, field: buildField(agents) };
	});

	return { ...sim, species: next, step: sim.step + 1 };
}

/** Gives every living agent a new random brain; positions, HP and lifetimes stay. */
export function recreate(sim: Sim): Sim {
	const species = sim.species.map((s) => ({
		...s,
		agents: s.agents.map((a) => ({ ...a, genome: randomGenome() })),
	}));
	return { ...sim, species };
}
