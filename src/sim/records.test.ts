import { describe, expect, it } from "vitest";
import { hallOfFameSize } from "./config";
import { spawn } from "./evolution";
import {
	addToHallOfFame,
	emptyHallOfFame,
	findDot,
	isDead,
	nearestDot,
	topDots,
	topHunterIds,
} from "./records";
import { createSim } from "./simulation";
import type { Agent, DeadAgent, Sim } from "./types";

let ids = 1000;
const dot = (fields: Partial<Agent> = {}): Agent => ({
	...spawn({ id: ids++, genome: [] }, { x: 0, y: 0 }),
	...fields,
});
const dead = (fields: Partial<Agent> = {}): DeadAgent => ({
	...dot(fields),
	diedStep: 5,
	cause: { kind: "hp" },
});

/** A sim whose species hold only the given living dots. */
const world = (...agents: Agent[][]): Sim => {
	const sim = createSim({ percent: 0, genes: 1 });
	return { ...sim, species: sim.species.map((s, i) => ({ ...s, agents: agents[i] ?? [] })) };
};

describe("addToHallOfFame", () => {
	it("ranks by kills and by lifetime, the other one breaking ties", () => {
		const a = dead({ kills: 3, lifetime: 10 });
		const b = dead({ kills: 3, lifetime: 50 });
		const c = dead({ kills: 1, lifetime: 90 });
		const hall = addToHallOfFame(emptyHallOfFame(), [a, b, c]);
		expect(hall.kills).toEqual([b, a, c]);
		expect(hall.lifetime).toEqual([c, b, a]);
	});

	it("keeps only the best hallOfFameSize of each ranking", () => {
		const many = Array.from({ length: hallOfFameSize + 5 }, (_, k) => dead({ kills: k }));
		const hall = addToHallOfFame(emptyHallOfFame(), many);
		expect(hall.kills).toHaveLength(hallOfFameSize);
		expect(hall.kills[0].kills).toBe(hallOfFameSize + 4);
	});

	it("returns the same hall when nobody died", () => {
		const hall = emptyHallOfFame();
		expect(addToHallOfFame(hall, [])).toBe(hall);
	});
});

describe("findDot", () => {
	it("finds a living dot, one that died last step and one in a hall of fame", () => {
		const living = dot();
		const justDied = dead();
		const famous = dead({ kills: 9 });
		const sim = world([], [living]);
		const withDead = {
			...sim,
			species: sim.species.map((s, i) =>
				i === 2
					? { ...s, lastDeaths: [justDied], hallOfFame: addToHallOfFame(s.hallOfFame, [famous]) }
					: s,
			),
		};
		expect(findDot(withDead, living.id)).toEqual({ species: 1, agent: living });
		expect(findDot(withDead, justDied.id)).toEqual({ species: 2, agent: justDied });
		expect(findDot(withDead, famous.id)).toEqual({ species: 2, agent: famous });
		expect(findDot(withDead, -1)).toBeNull();
	});
});

describe("topDots", () => {
	it("mixes living and dead dots of every species", () => {
		const best = dot({ kills: 8 });
		const second = dead({ kills: 5 });
		const third = dot({ kills: 2 });
		const sim = world([third], [best]);
		const withDead = {
			...sim,
			species: sim.species.map((s, i) =>
				i === 2 ? { ...s, hallOfFame: addToHallOfFame(s.hallOfFame, [second]) } : s,
			),
		};
		expect(topDots(withDead, "kills", 3)).toEqual([
			{ species: 1, agent: best },
			{ species: 2, agent: second },
			{ species: 0, agent: third },
		]);
	});

	it("fills the slots from the living when the dead are hidden", () => {
		const living = [dot({ kills: 3 }), dot({ kills: 2 }), dot({ kills: 1 })];
		const sim = world(living);
		const withDead = {
			...sim,
			species: sim.species.map((s) => ({
				...s,
				hallOfFame: addToHallOfFame(s.hallOfFame, [dead({ kills: 9 }), dead({ kills: 8 })]),
			})),
		};
		const filter = { dead: false, species: [true, true, true] };
		expect(topDots(withDead, "kills", 3, filter).map((d) => d.agent)).toEqual(living);
	});

	it("leaves out hidden species", () => {
		const red = dot({ kills: 9 });
		const green = dot({ kills: 5 });
		const blue = dot({ kills: 1 });
		const filter = { dead: true, species: [false, true, true] };
		expect(topDots(world([red], [green], [blue]), "kills", 3, filter)).toEqual([
			{ species: 1, agent: green },
			{ species: 2, agent: blue },
		]);
	});
});

describe("topHunterIds", () => {
	it("takes each species' living dot with the most kills", () => {
		const red = dot({ kills: 4 });
		const green = dot({ kills: 2 });
		expect(topHunterIds(world([dot({ kills: 1 }), red], [green, dot({ kills: 1 })]))).toEqual([
			red.id,
			green.id,
			null,
		]);
	});

	it("breaks a tie on kills by the longer life", () => {
		const older = dot({ kills: 3, lifetime: 90 });
		expect(topHunterIds(world([dot({ kills: 3, lifetime: 10 }), older]))[0]).toBe(older.id);
	});

	it("names no one while a species has no kills", () => {
		expect(topHunterIds(world([dot(), dot()]))).toEqual([null, null, null]);
	});
});

describe("nearestDot", () => {
	it("takes the closest living dot within reach", () => {
		const near = dot({ x: 11, y: 10 });
		const far = dot({ x: 13, y: 10 });
		expect(nearestDot(world([far], [near]), 10, 10, 3)).toEqual({ species: 1, agent: near });
	});

	it("finds nothing past the reach", () => {
		expect(nearestDot(world([dot({ x: 14, y: 10 })]), 10, 10, 3)).toBeNull();
	});

	it("reaches exactly maxCells", () => {
		const edge = dot({ x: 13, y: 10 });
		expect(nearestDot(world([edge]), 10, 10, 3)?.agent).toBe(edge);
	});
});

describe("isDead", () => {
	it("tells dead dots from living ones", () => {
		expect(isDead(dead())).toBe(true);
		expect(isDead(dot())).toBe(false);
	});
});
