import { describe, expect, it } from "vitest";
import {
	baseDecayPerStep,
	gridWidth,
	hiddenSize,
	hpPenaltyFromWall,
	matureAge,
	oldAge,
	populationSize,
	speciesDefs,
	startHp,
} from "./config";
import { buildField } from "./field";
import { hiddenWeightsFrom } from "./network";
import { createSim, extinctSpecies, moveAgent, recreate, step } from "./simulation";
import type { Agent } from "./types";

const mutation = { percent: 5, genes: 1 };

describe("moveAgent", () => {
	const at = (x: number, y: number): Agent => ({
		genome: [],
		hp: startHp,
		x,
		y,
		prevX: x,
		prevY: y,
		lifetime: 0,
	});

	it("moves without HP cost on open ground", () => {
		expect(moveAgent(at(10, 10), 5, hpPenaltyFromWall)).toMatchObject({
			x: 11,
			y: 10,
			prevX: 10,
			prevY: 10,
			hp: startHp,
		});
	});

	it("bounces off a wall and pays for the bump", () => {
		const agent = at(gridWidth - 1, 10);
		const moved = moveAgent(agent, 5, 250);
		expect(moved).toMatchObject({ x: gridWidth - 2, y: 10, hp: startHp - 250 });
		expect(agent.hp).toBe(startHp);
	});

	it("costs nothing to stand next to a wall or walk along it", () => {
		expect(moveAgent(at(0, 10), 4, hpPenaltyFromWall).hp).toBe(startHp);
		expect(moveAgent(at(0, 10), 7, hpPenaltyFromWall).hp).toBe(startHp);
	});
});

describe("simulation", () => {
	it("starts with a full population per species and a matching field", () => {
		const sim = createSim(mutation);
		expect(sim.species.map((s) => s.id)).toEqual(speciesDefs.map((d) => d.id));
		for (const s of sim.species) {
			expect(s.agents).toHaveLength(populationSize);
			const total = s.field.reduce((sum, col) => sum + col.reduce((a, b) => a + b, 0), 0);
			expect(total).toBe(populationSize);
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
		const loner = { ...sim.species[0].agents[0], genome: goWest, x: 0, y: 50, hp: startHp };
		const world = {
			...sim,
			wallPenalty: 700,
			species: sim.species.map((s, i) => {
				const agents = i === 0 ? [loner] : [];
				return { ...s, agents, field: buildField(agents) };
			}),
		};
		const bumped = step(world).species[0].agents.find((a) => a.genome === goWest);
		expect(bumped).toMatchObject({ x: 1, y: 50, hp: startHp - baseDecayPerStep - 700 });
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
			hp: startHp,
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
		const moved = step(world).species[0].agents.map(({ x, y }) => ({ x, y }));
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
		for (const s of next.species) {
			expect(s.agents.length).toBeGreaterThanOrEqual(populationSize - 1);
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

	it("recreate swaps brains only", () => {
		const sim = step(createSim(mutation));
		const fresh = recreate(sim);
		const a = sim.species[1].agents[3];
		const b = fresh.species[1].agents[3];
		expect(b.genome).not.toBe(a.genome);
		expect({ ...b, genome: null }).toEqual({ ...a, genome: null });
	});

	it("lists species with no agents left", () => {
		const sim = createSim(mutation);
		expect(extinctSpecies(sim)).toEqual([]);
		const dead = {
			...sim,
			species: sim.species.map((s) => (s.id === "G" ? { ...s, agents: [] } : s)),
		};
		expect(extinctSpecies(dead)).toEqual(["G"]);
	});

	it("keeps stepping the others when one species is gone", () => {
		const sim = createSim(mutation);
		const dead = {
			...sim,
			species: sim.species.map((s) => (s.id === "G" ? { ...s, agents: [] } : s)),
		};
		const next = step(dead);
		expect(extinctSpecies(next)).toEqual(["G"]);
	});
});
