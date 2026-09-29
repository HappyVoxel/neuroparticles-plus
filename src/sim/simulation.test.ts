import { describe, expect, it } from "vitest";
import { gridWidth, hpPenaltyFromWall, populationSize, speciesDefs, startHp } from "./config";
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
		expect(moveAgent(at(10, 10), 5)).toMatchObject({
			x: 11,
			y: 10,
			prevX: 10,
			prevY: 10,
			hp: startHp,
		});
	});

	it("bounces off a wall and pays for the bump", () => {
		const agent = at(gridWidth - 1, 10);
		const moved = moveAgent(agent, 5);
		expect(moved).toMatchObject({ x: gridWidth - 2, y: 10, hp: startHp - hpPenaltyFromWall });
		expect(agent.hp).toBe(startHp);
	});

	it("costs nothing to stand next to a wall or walk along it", () => {
		expect(moveAgent(at(0, 10), 4).hp).toBe(startHp);
		expect(moveAgent(at(0, 10), 7).hp).toBe(startHp);
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
