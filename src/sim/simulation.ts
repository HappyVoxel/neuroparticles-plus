import { capture } from "./capture";
import {
	hpPenaltyFromWall,
	inputSize,
	outputSize,
	speciesCount,
	speciesDefs,
	totalPopulation,
} from "./config";
import { emptyDisease, spreadDisease } from "./disease";
import { ageAndCull, breed, spawn } from "./evolution";
import { buildField, senseAt } from "./field";
import { hitsWall, type Move, moveCount, moveX, moveY, stayMove, stepMoves } from "./movement";
import { evaluate, pickMove, randomGenome } from "./network";
import { addToHallOfFame, emptyHallOfFame } from "./records";
import type { Agent, Field, MutationParams, Sim, SimView, Species } from "./types";

export function createSim(mutation: MutationParams, wallPenalty = hpPenaltyFromWall): Sim {
	let nextId = 0;
	const species = speciesDefs.map((def): Species => {
		const agents = Array.from({ length: Math.floor(totalPopulation / speciesCount) }, () =>
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
		x: moveX(x, move),
		y: moveY(y, move),
		stays: move === stayMove ? agent.stays + 1 : agent.stays,
		steps: move !== stayMove && move < stepMoves ? agent.steps + 1 : agent.steps,
		jumps: move >= stepMoves ? agent.jumps + 1 : agent.jumps,
		wallBumps: bump ? agent.wallBumps + 1 : agent.wallBumps,
		hpLostWall: bump ? agent.hpLostWall + wallPenalty : agent.hpLostWall,
	};
}

// One input and one output buffer for every agent's turn; `think` uses them and lets go.
const input = new Array<number>(inputSize).fill(0);
const output = new Array<number>(outputSize).fill(0);

function think(
	agent: Agent,
	fields: readonly Field[],
	diseaseCost: readonly Float32Array[],
	wallPenalty: number,
): Agent {
	evaluate(senseAt(fields, diseaseCost, agent.x, agent.y, input), agent.genome, output);
	const move = pickMove(output, moveCount(agent.lifetime));
	return moveAgent(agent, move, wallPenalty);
}

/**
 * One tick: hunters catch the prey on their cell, every species ages and dies, all breed into the
 * shared budget, then every agent moves, then the fields and the disease are rebuilt. All of it reads the positions, fields
 * and disease from the previous tick, so moves don't see each other. The dead go to their
 * species' hall of fame.
 */
export function step(sim: Sim): Sim {
	const { species, mutation, wallPenalty, disease } = sim;
	const fields = species.map((s) => s.field);
	const now = sim.step + 1;

	const captured = capture(species);

	const culled = species.map((self) => ageAndCull(self, disease.cost, captured, now));
	const bred = breed(
		culled.map((c) => c.survivors),
		mutation,
		sim.nextId,
		now,
	);
	const born = bred.children.reduce((sum, c) => sum + c.length, 0);

	const next = species.map((self, i): Species => {
		const agents = [...bred.survivors[i], ...bred.children[i]].map((a) =>
			think(a, fields, disease.cost, wallPenalty),
		);
		const { dead } = culled[i];
		const hallOfFame = addToHallOfFame(self.hallOfFame, dead);
		return { ...self, agents, field: buildField(agents), hallOfFame, lastDeaths: dead };
	});

	return {
		...sim,
		species: next,
		step: now,
		nextId: sim.nextId + born,
		disease: spreadDisease(
			disease,
			next.map((s) => s.field),
			now,
		),
	};
}

/** Indexes in `Sim.species` of species with no agents left; the sim stops once this is non-empty. */
export function extinctSpecies(sim: SimView): number[] {
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
			peakHp: hp,
			lifetime,
		})),
	}));
	return { ...sim, species, nextId };
}
