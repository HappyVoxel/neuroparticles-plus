import { hpPenaltyFromWall, populationSize, speciesDefs } from "./config";
import { emptyDisease, spreadDisease } from "./disease";
import { ageAndCull, breed, spawn } from "./evolution";
import { buildField, senseAt } from "./field";
import { hitsWall, type Move, moveBy, moveCount } from "./movement";
import { evaluate, pickMove, randomGenome } from "./network";
import type { Agent, Field, MutationParams, Sim, Species } from "./types";

export function createSim(mutation: MutationParams): Sim {
	const species = speciesDefs.map((def): Species => {
		const agents = Array.from({ length: populationSize }, () => spawn(randomGenome()));
		return { ...def, agents, field: buildField(agents) };
	});
	return { species, step: 0, mutation, wallPenalty: hpPenaltyFromWall, disease: emptyDisease() };
}

/** Applies a move. Bumping into a wall bounces the agent back and costs `wallPenalty` HP. */
export function moveAgent(agent: Agent, move: Move, wallPenalty: number): Agent {
	const { x, y } = agent;
	const hp = hitsWall(x, y, move) ? agent.hp - wallPenalty : agent.hp;
	return { ...agent, hp, prevX: x, prevY: y, ...moveBy(x, y, move) };
}

function think(
	agent: Agent,
	fields: readonly Field[],
	diseaseCost: readonly Float32Array[],
	wallPenalty: number,
): Agent {
	const output = evaluate(senseAt(fields, diseaseCost, agent.x, agent.y), agent.genome);
	const move = pickMove(output, moveCount(agent.lifetime));
	return moveAgent(agent, move, wallPenalty);
}

/**
 * One tick: every species ages, dies and breeds, then every agent moves, then the fields and the
 * disease are rebuilt. All of it reads the fields and disease from the previous tick, so moves
 * don't see each other.
 */
export function step(sim: Sim): Sim {
	const { species, mutation, wallPenalty, disease } = sim;
	const n = species.length;
	const fields = species.map((s) => s.field);

	const next = species.map((self, i) => {
		const enemies = species[(i + n - 1) % n];
		const prey = species[(i + 1) % n];
		const survivors = ageAndCull(self, enemies, prey, disease.cost);
		const agents = [...survivors, ...breed(survivors, mutation)].map((a) =>
			think(a, fields, disease.cost, wallPenalty),
		);
		return { ...self, agents, field: buildField(agents) };
	});

	return {
		...sim,
		species: next,
		step: sim.step + 1,
		disease: spreadDisease(
			disease,
			next.map((s) => s.field),
		),
	};
}

/** Ids of species with no agents left; the sim stops once this is non-empty. */
export function extinctSpecies(sim: Sim): Species["id"][] {
	return sim.species.filter((s) => s.agents.length === 0).map((s) => s.id);
}

/** Gives every living agent a new random brain; positions, HP and lifetimes stay. */
export function recreate(sim: Sim): Sim {
	const species = sim.species.map((s) => ({
		...s,
		agents: s.agents.map((a) => ({ ...a, genome: randomGenome() })),
	}));
	return { ...sim, species };
}
