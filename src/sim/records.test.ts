import { describe, expect, it } from "vitest";
import { hallOfFameSize } from "./config";
import { spawn } from "./evolution";
import {
	addToHallOfFame,
	emptyHallOfFame,
	findDot,
	isDead,
	leaderIds,
	nearestDot,
	topDots,
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

	it("ranks by peak HP, kills breaking ties", () => {
		const a = dead({ peakHp: 50000, kills: 1 });
		const b = dead({ peakHp: 50000, kills: 4 });
		const c = dead({ peakHp: 90000 });
		expect(addToHallOfFame(emptyHallOfFame(), [a, b, c]).peakHp).toEqual([c, b, a]);
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

	it("finds a dead dot kept only for its peak HP", () => {
		const rich = dead({ peakHp: 90000 });
		const sim = world();
		const withRich = {
			...sim,
			species: sim.species.map((s, i) =>
				i === 0 ? { ...s, hallOfFame: { ...emptyHallOfFame(), peakHp: [rich] } } : s,
			),
		};
		expect(findDot(withRich, rich.id)).toEqual({ species: 0, agent: rich });
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

	it("ranks living and dead dots by peak HP", () => {
		const living = dot({ peakHp: 40000 });
		const rich = dead({ peakHp: 90000 });
		const sim = world([living]);
		const withDead = {
			...sim,
			species: sim.species.map((s, i) =>
				i === 1 ? { ...s, hallOfFame: addToHallOfFame(s.hallOfFame, [rich]) } : s,
			),
		};
		expect(topDots(withDead, "peakHp", 2)).toEqual([
			{ species: 1, agent: rich },
			{ species: 0, agent: living },
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

	it("skips dots at 0 on the ranking", () => {
		const hunter = dot({ kills: 1 });
		const idle = dot({ lifetime: 50 });
		const sim = world([idle, hunter], [dot()]);
		expect(topDots(sim, "kills", 3)).toEqual([{ species: 0, agent: hunter }]);
		expect(topDots(sim, "lifetime", 3)).toEqual([{ species: 0, agent: idle }]);
	});

	it("breaks a full tie by species order, the living before the dead", () => {
		const redLiving = dot({ kills: 2, lifetime: 5 });
		const redDead = dead({ kills: 2, lifetime: 5 });
		const greenLiving = dot({ kills: 2, lifetime: 5 });
		const sim = world([redLiving], [greenLiving]);
		const withDead = {
			...sim,
			species: sim.species.map((s, i) =>
				i === 0 ? { ...s, hallOfFame: addToHallOfFame(s.hallOfFame, [redDead]) } : s,
			),
		};
		expect(topDots(withDead, "kills", 2)).toEqual([
			{ species: 0, agent: redLiving },
			{ species: 0, agent: redDead },
		]);
	});
});

describe("leaderIds", () => {
	it("takes each species' living dot with the most kills", () => {
		const red = dot({ kills: 4 });
		const green = dot({ kills: 2 });
		expect(leaderIds(world([dot({ kills: 1 }), red], [green, dot({ kills: 1 })]), "kills")).toEqual(
			[red.id, green.id, null],
		);
	});

	it("takes each species' oldest living dot", () => {
		const red = dot({ lifetime: 90 });
		const blue = dot({ lifetime: 5 });
		expect(
			leaderIds(world([dot({ lifetime: 10, kills: 9 }), red], [], [blue]), "lifetime"),
		).toEqual([red.id, null, blue.id]);
	});

	it("breaks a tie by the other ranking", () => {
		const older = dot({ kills: 3, lifetime: 90 });
		expect(leaderIds(world([dot({ kills: 3, lifetime: 10 }), older]), "kills")[0]).toBe(older.id);
		const hunter = dot({ kills: 2, lifetime: 50 });
		expect(leaderIds(world([dot({ lifetime: 50 }), hunter]), "lifetime")[0]).toBe(hunter.id);
	});

	it("names no one while a species is at 0 on the ranking", () => {
		expect(leaderIds(world([dot(), dot()]), "kills")).toEqual([null, null, null]);
		expect(leaderIds(world([dot(), dot()]), "lifetime")).toEqual([null, null, null]);
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
