import { capture } from "./capture";
import { hpPenaltyFromWall, populationSize, speciesDefs } from "./config";
import { emptyDisease, spreadDisease } from "./disease";
import { ageAndCull, breed, spawn } from "./evolution";
import { buildField, senseAt } from "./field";
import { hitsWall, type Move, moveBy, moveCount, stayMove, stepMoves } from "./movement";
import { evaluate, pickMove, randomGenome } from "./network";
import { addToHallOfFame, emptyHallOfFame } from "./records";
import type { Agent, Field, MutationParams, Sim, Species } from "./types";

export function createSim(mutation: MutationParams, wallPenalty = hpPenaltyFromWall): Sim {
	let nextId = 0;
	const species = speciesDefs.map((def): Species => {
		const agents = Array.from({ length: populationSize }, () =>
			spawn({ id: nextId++, genome: randomGenome() }),
		);
		const hallOfFame = emptyHallOfFame();
		return { ...def, agents, field: buildField(agents), hallOfFame, lastDeaths: [] };
	});
	return { species, step: 0, mutation, wallPenalty, disease: emptyDisease(), nextId };
}

/**
 * Applies a move and counts it as a stay, a one-cell step or a jump. Bumping into a wall bounces
 * the agent back and costs `wallPenalty` HP.
 */
export function moveAgent(agent: Agent, move: Move, wallPenalty: number): Agent {
	const { x, y } = agent;
	const bump = hitsWall(x, y, move);
	return {
		...agent,
		hp: bump ? agent.hp - wallPenalty : agent.hp,
		prevX: x,
		prevY: y,
		...moveBy(x, y, move),
		stays: move === stayMove ? agent.stays + 1 : agent.stays,
		steps: move !== stayMove && move < stepMoves ? agent.steps + 1 : agent.steps,
		jumps: move >= stepMoves ? agent.jumps + 1 : agent.jumps,
		wallBumps: bump ? agent.wallBumps + 1 : agent.wallBumps,
		hpLostWall: bump ? agent.hpLostWall + wallPenalty : agent.hpLostWall,
	};
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
 * One tick: hunters catch the prey on their cell, every species ages, dies and breeds, then every
 * agent moves, then the fields and the disease are rebuilt. All of it reads the positions, fields
 * and disease from the previous tick, so moves don't see each other. The dead go to their
 * species' hall of fame.
 */
export function step(sim: Sim): Sim {
	const { species, mutation, wallPenalty, disease } = sim;
	const fields = species.map((s) => s.field);
	const now = sim.step + 1;
	let nextId = sim.nextId;

	const captured = capture(species);

	const next = species.map((self): Species => {
		const { survivors, dead } = ageAndCull(self, disease.cost, captured, now);
		const bred = breed(survivors, mutation, nextId, now);
		nextId += bred.children.length;
		const agents = [...bred.survivors, ...bred.children].map((a) =>
			think(a, fields, disease.cost, wallPenalty),
		);
		const hallOfFame = addToHallOfFame(self.hallOfFame, dead);
		return { ...self, agents, field: buildField(agents), hallOfFame, lastDeaths: dead };
	});

	return {
		...sim,
		species: next,
		step: now,
		nextId,
		disease: spreadDisease(
			disease,
			next.map((s) => s.field),
			now,
		),
	};
}

/** Indexes in `Sim.species` of species with no agents left; the sim stops once this is non-empty. */
export function extinctSpecies(sim: Sim): number[] {
	return sim.species.flatMap((s, i) => (s.agents.length === 0 ? [i] : []));
}

/**
 * Gives every living agent a new random brain. A new brain makes a new dot: it gets a new id and
 * zeroed counters, and keeps its position, HP, lifetime and birth step.
 */
export function recreate(sim: Sim): Sim {
	let nextId = sim.nextId;
	const species = sim.species.map((s) => ({
		...s,
		agents: s.agents.map(({ x, y, prevX, prevY, hp, lifetime, bornStep }) => ({
			...spawn({ id: nextId++, genome: randomGenome(), bornStep }, { x, y }),
			prevX,
			prevY,
			hp,
			lifetime,
		})),
	}));
	return { ...sim, species, nextId };
}
