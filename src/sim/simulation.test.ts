import { describe, expect, it } from "vitest";
import {
	baseDecayPerStep,
	diseaseHpAtCenter,
	gridWidth,
	hiddenSize,
	hpPenaltyFromWall,
	matureAge,
	oldAge,
	speciesCount,
	totalPopulation,
	speciesDefs,
	primeHp,
} from "./config";
import { diseaseBirthRadius } from "./disease";
import { grownHpAt, spawn } from "./evolution";
import { buildField } from "./field";
import { hiddenWeightsFrom } from "./network";
import { createSim, extinctSpecies, moveAgent, recreate, step } from "./simulation";
import type { Agent, Sim } from "./types";

const mutation = { percent: 5, genes: 1 };
// The first dot of a species as an adult with HP under its cap, so a step changes HP only by what
// the test sets up.
const adult = (sim: Sim, species = 0): Agent => ({
	...sim.species[species].agents[0],
	lifetime: matureAge,
	hp: 5000,
});

describe("moveAgent", () => {
	const at = (x: number, y: number): Agent => spawn({ id: 0, genome: [] }, { x, y });

	it("moves without HP cost on open ground", () => {
		expect(moveAgent(at(10, 10), 5, hpPenaltyFromWall)).toMatchObject({
			x: 11,
			y: 10,
			prevX: 10,
			prevY: 10,
			hp: grownHpAt(0),
		});
	});

	it("bounces off a wall and pays for the bump", () => {
		const agent = at(gridWidth - 1, 10);
		const moved = moveAgent(agent, 5, 250);
		expect(moved).toMatchObject({ x: gridWidth - 2, y: 10, hp: grownHpAt(0) - 250 });
		expect(agent.hp).toBe(grownHpAt(0));
	});

	it("counts stays, one-cell steps, jumps and wall bumps", () => {
		const stay = moveAgent(at(10, 10), 4, 0);
		const east = moveAgent(stay, 5, 0);
		const jump = moveAgent(east, 16, 0);
		const bump = moveAgent(at(0, 10), 3, 250);
		expect(jump).toMatchObject({ stays: 1, steps: 1, jumps: 1, wallBumps: 0 });
		expect(bump).toMatchObject({ steps: 1, wallBumps: 1, hpLostWall: 250 });
	});

	it("costs nothing to stand next to a wall or walk along it", () => {
		expect(moveAgent(at(0, 10), 4, hpPenaltyFromWall).hp).toBe(grownHpAt(0));
		expect(moveAgent(at(0, 10), 7, hpPenaltyFromWall).hp).toBe(grownHpAt(0));
	});
});

describe("simulation", () => {
	it("starts with a full population per species and a matching field", () => {
		const sim = createSim(mutation);
		expect(sim.species.map((s) => s.id)).toEqual(speciesDefs.map((d) => d.id));
		for (const s of sim.species) {
			expect(s.agents).toHaveLength(totalPopulation / speciesCount);
			const total = s.field.reduce((sum, col) => sum + col.reduce((a, b) => a + b, 0), 0);
			expect(total).toBe(totalPopulation / speciesCount);
		}
	});

	it("starts with the default wall penalty and keeps a changed one across steps", () => {
		const sim = createSim(mutation);
		expect(sim.wallPenalty).toBe(hpPenaltyFromWall);
		expect(step({ ...sim, wallPenalty: 700 }).wallPenalty).toBe(700);
	});

	it("charges the sim's wall penalty for a bump", () => {
		const sim = createSim(mutation);
		// One agent alone in the world, at the west wall, with a brain that always picks W.
		const goWest = sim.species[0].agents[0].genome.map(() => 0);
		for (let k = 0; k < hiddenSize; k++) goWest[hiddenWeightsFrom + 3 * hiddenSize + k] = 2;
		const loner = { ...adult(sim), genome: goWest, x: 0, y: 50 };
		const world = {
			...sim,
			wallPenalty: 700,
			species: sim.species.map((s, i) => {
				const agents = i === 0 ? [loner] : [];
				return { ...s, agents, field: buildField(agents) };
			}),
		};
		const bumped = step(world).species[0].agents.find((a) => a.genome === goWest);
		expect(bumped).toMatchObject({ x: 1, y: 50, hp: 5000 - baseDecayPerStep - 700 });
	});

	it("kills the prey on a hunter's cell and hands the hunter its HP", () => {
		const sim = createSim(mutation);
		const hunter = { ...adult(sim), x: 50, y: 50, hp: 1000 };
		const prey = { ...adult(sim, 1), x: 50, y: 50, hp: 400 };
		const world = {
			...sim,
			species: sim.species.map((s, i) => {
				const agents = i === 0 ? [hunter] : i === 1 ? [prey] : [];
				return { ...s, agents, field: buildField(agents) };
			}),
		};
		const next = step(world);
		expect(next.species[1].agents).toEqual([]);
		const fed = next.species[0].agents.find((a) => a.genome === hunter.genome);
		expect(fed).toMatchObject({ hp: 1400 - baseDecayPerStep, kills: 1 });
	});

	it("charges last step's disease and rebuilds it after the moves", () => {
		const sim = createSim(mutation);
		const loner = { ...adult(sim), x: 50, y: 50 };
		const area = {
			id: 0,
			x: 50,
			y: 50,
			radius: diseaseBirthRadius,
			species: 0,
			emptySteps: 0,
			bornStep: 0,
			pandemicStep: null,
		};
		const disease = { ...sim.disease, areas: [area] };
		disease.cost = disease.cost.map((column) => column.slice());
		disease.cost[50][50] = diseaseHpAtCenter;
		const world = {
			...sim,
			disease,
			species: sim.species.map((s, i) => {
				const agents = i === 0 ? [loner] : [];
				return { ...s, agents, field: buildField(agents) };
			}),
		};
		const next = step(world);
		const survivor = next.species[0].agents.find((a) => a.genome === loner.genome);
		expect(survivor?.hp).toBe(5000 - diseaseHpAtCenter - baseDecayPerStep);
		// One dot of its own inside, so it shrinks by a cell.
		expect(next.disease.areas).toEqual([{ ...area, radius: diseaseBirthRadius - 1 }]);
		expect(sim.disease.areas).toEqual([]);
	});

	it("lets only adults knight-jump", () => {
		const sim = createSim(mutation);
		// A brain that always wants move 16, a knight jump to SSE.
		const jumper = sim.species[0].agents[0].genome.map(() => 0);
		for (let k = 0; k < hiddenSize; k++) jumper[hiddenWeightsFrom + 16 * hiddenSize + k] = 2;
		const at = (x: number, lifetime: number) => ({
			...sim.species[0].agents[0],
			genome: jumper,
			x,
			y: 50,
			hp: primeHp,
			lifetime,
		});
		const agents = [at(20, 0), at(40, matureAge), at(60, oldAge)];
		const world = {
			...sim,
			species: sim.species.map((s, i) => {
				const own = i === 0 ? agents : [];
				return { ...s, agents: own, field: buildField(own) };
			}),
		};
		// The two mature dots also breed; their children are still at lifetime 0.
		const moved = step(world)
			.species[0].agents.filter((a) => a.lifetime > 0)
			.map(({ x, y }) => ({ x, y }));
		expect(moved).toEqual([
			{ x: 20, y: 50 },
			{ x: 41, y: 52 },
			{ x: 60, y: 50 },
		]);
	});

	it("steps without mutating the previous state", () => {
		const sim = createSim(mutation);
		const before = sim.species[0].agents[0];
		const snapshot = { ...before };
		const next = step(sim);

		expect(next.step).toBe(1);
		expect(sim.step).toBe(0);
		expect(before).toEqual(snapshot);
		const alive = next.species.reduce((sum, s) => sum + s.agents.length, 0);
		expect(alive).toBeLessThanOrEqual(totalPopulation);
		for (const s of next.species) {
			for (const a of s.agents) expect(a.lifetime).toBeLessThanOrEqual(1);
		}
	});

	it("remembers where each agent stood before its move", () => {
		const sim = createSim(mutation);
		const next = step(sim);
		const before = sim.species[0].agents[0];
		const after = next.species[0].agents[0];
		expect(after).toMatchObject({ prevX: before.x, prevY: before.y });
	});

	it("gives every dot a unique id and hands out the next one", () => {
		const sim = createSim(mutation);
		const ids = sim.species.flatMap((s) => s.agents.map((a) => a.id));
		expect(new Set(ids).size).toBe(ids.length);
		expect(sim.nextId).toBe(Math.max(...ids) + 1);
	});

	it("sends the dead to their species' hall of fame and lastDeaths", () => {
		const sim = createSim(mutation);
		const hunter = { ...sim.species[0].agents[0], x: 50, y: 50 };
		const prey = { ...sim.species[1].agents[0], x: 50, y: 50 };
		const world = {
			...sim,
			species: sim.species.map((s, i) => {
				const agents = i === 0 ? [hunter] : i === 1 ? [prey] : [];
				return { ...s, agents, field: buildField(agents) };
			}),
		};
		const next = step(world);
		const cause = { kind: "caught", by: 0, killers: [hunter.id] };
		expect(next.species[1].lastDeaths).toEqual([{ ...prey, diedStep: 1, cause }]);
		expect(next.species[1].hallOfFame.kills.map((a) => a.id)).toEqual([prey.id]);
		expect(step(next).species[1].lastDeaths).toEqual([]);
	});

	it("gives children ids from nextId on", () => {
		const sim = createSim(mutation);
		const [a, b] = sim.species[0].agents;
		const pair = [
			{ ...a, x: 10, y: 10, lifetime: matureAge },
			{ ...b, x: 12, y: 10, lifetime: matureAge },
		];
		const world = {
			...sim,
			species: sim.species.map((s, i) => {
				const agents = i === 0 ? pair : [];
				return { ...s, agents, field: buildField(agents) };
			}),
		};
		const next = step(world);
		const children = next.species[0].agents.filter((c) => c.parents !== null);
		expect(children.length).toBeGreaterThan(0);
		expect(children.map((c) => c.id)).toEqual(children.map((_, k) => sim.nextId + k));
		expect(next.nextId).toBe(sim.nextId + children.length);
	});

	it("recreate makes new dots in the old places", () => {
		const sim = step(createSim(mutation));
		const fresh = recreate(sim);
		const a = { ...sim.species[1].agents[3], kills: 4, stays: 9 };
		const b = recreate({
			...sim,
			species: sim.species.map((s, i) =>
				i === 1 ? { ...s, agents: s.agents.map((x, k) => (k === 3 ? a : x)) } : s,
			),
		}).species[1].agents[3];
		expect(b.genome).not.toBe(a.genome);
		expect(b.id).toBeGreaterThanOrEqual(sim.nextId);
		expect(b).toMatchObject({
			x: a.x,
			y: a.y,
			prevX: a.prevX,
			prevY: a.prevY,
			hp: a.hp,
			lifetime: a.lifetime,
			bornStep: a.bornStep,
			parents: null,
			kills: 0,
			stays: 0,
		});
		expect(fresh.nextId).toBe(sim.nextId + fresh.species.reduce((n, s) => n + s.agents.length, 0));
	});

	it("lists species with no agents left", () => {
		const sim = createSim(mutation);
		expect(extinctSpecies(sim)).toEqual([]);
		const dead = {
			...sim,
			species: sim.species.map((s) => (s.id === "G" ? { ...s, agents: [] } : s)),
		};
		expect(extinctSpecies(dead)).toEqual([1]);
	});

	it("keeps stepping the others when one species is gone", () => {
		const sim = createSim(mutation);
		const dead = {
			...sim,
			species: sim.species.map((s) => (s.id === "G" ? { ...s, agents: [] } : s)),
		};
		const next = step(dead);
		expect(extinctSpecies(next)).toEqual([1]);
	});
});
