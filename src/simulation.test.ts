import { describe, expect, it } from "vitest";
import { populationSize, speciesDefs } from "./config";
import { createSim, recreate, step } from "./simulation";

const mutation = { percent: 5, genes: 1 };

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

	it("recreate swaps brains only", () => {
		const sim = step(createSim(mutation));
		const fresh = recreate(sim);
		const a = sim.species[1].agents[3];
		const b = fresh.species[1].agents[3];
		expect(b.genome).not.toBe(a.genome);
		expect({ ...b, genome: null }).toEqual({ ...a, genome: null });
	});
});
