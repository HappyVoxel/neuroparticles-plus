import { describe, expect, it } from "vitest";
import { capture } from "./capture";
import { matureAge, speciesDefs, visionRadiusSquared } from "./config";
import { spawn } from "./evolution";
import { emptyHallOfFame } from "./records";
import { buildField } from "./field";
import type { Agent, Species } from "./types";

let ids = 0;
const at = (x: number, y: number, hp = 1000): Agent => ({
	...spawn({ id: ids++, genome: [] }, { x, y }),
	hp,
});

// Red, Green, Blue in order: each catches the next one.
const world = (...agents: Agent[][]): Species[] =>
	speciesDefs.map((def, i) => ({
		...def,
		agents: agents[i] ?? [],
		field: buildField(agents[i] ?? []),
		hallOfFame: emptyHallOfFame(),
		lastDeaths: [],
	}));

describe("capture", () => {
	it("catches nothing while hunter and prey stand on different cells", () => {
		const { caught, gain } = capture(world([at(1, 1)], [at(1, 2)]));
		expect(caught.size).toBe(0);
		expect(gain.size).toBe(0);
	});

	it("gives a hunter all the HP of the prey on its cell", () => {
		const red = at(5, 5);
		const green = at(5, 5, 700);
		const { caught, gain } = capture(world([red], [green]));
		expect([...caught.keys()]).toEqual([green]);
		expect(gain.get(red)).toBe(700);
	});

	it("follows the loop: Green catches Blue, Blue catches Red, never the other way", () => {
		const red = at(5, 5);
		const green = at(9, 9);
		const blueOnRed = at(5, 5, 400);
		const blueOnGreen = at(9, 9, 600);
		const { caught, gain } = capture(world([red], [green], [blueOnRed, blueOnGreen]));
		expect(new Set(caught.keys())).toEqual(new Set([red, blueOnGreen]));
		expect(gain.get(blueOnRed)).toBe(1000);
		expect(gain.get(green)).toBe(600);
		expect(gain.has(red)).toBe(false);
	});

	it("names the hunters' species and ids as the cause", () => {
		const hunters = [at(5, 5), at(5, 5)];
		const prey = at(5, 5);
		const { caught } = capture(world([prey], [], hunters));
		expect(caught.get(prey)).toEqual({
			kind: "caught",
			by: 2,
			killers: hunters.map((h) => h.id),
		});
	});

	it("splits the prey's HP equally between the hunters on its cell", () => {
		const hunters = [at(5, 5), at(5, 5), at(5, 5)];
		const { gain } = capture(world(hunters, [at(5, 5, 900)]));
		expect(hunters.map((h) => gain.get(h))).toEqual([300, 300, 300]);
	});

	it("adds up every prey a hunter catches in one step", () => {
		const red = at(5, 5);
		const { caught, gain } = capture(world([red], [at(5, 5, 200), at(5, 5, 300)]));
		expect(caught.size).toBe(2);
		expect(gain.get(red)).toBe(500);
	});

	it("lets a dot that is caught this step still catch", () => {
		const red = at(5, 5);
		const green = at(5, 5, 800);
		const blue = at(5, 5, 600);
		const { caught, gain } = capture(world([red], [green], [blue]));
		expect(new Set(caught.keys())).toEqual(new Set([red, green, blue]));
		expect(gain.get(red)).toBe(800);
		expect(gain.get(green)).toBe(600);
		expect(gain.get(blue)).toBe(1000);
	});
});

describe("capture feeding", () => {
	/** A young dot of the hunter's species whose parent is `parent`. */
	const childOf = (parent: Agent, x: number, y: number, lifetime = 10): Agent => ({
		...at(x, y),
		parents: [parent.id, -1],
		lifetime,
	});

	it("passes half of a catch to the hunter's young children in view, split equally", () => {
		const red = at(5, 5);
		const kids = [childOf(red, 6, 5), childOf(red, 5, 7)];
		const { gain, fed } = capture(world([red, ...kids], [at(5, 5, 800)]));
		expect(gain.get(red)).toBe(400);
		expect(kids.map((k) => fed.get(k))).toEqual([200, 200]);
	});

	it("keeps the whole catch with no young child in view", () => {
		const red = at(5, 5);
		const far = childOf(red, 5 + Math.ceil(Math.sqrt(visionRadiusSquared)), 5);
		const grown = childOf(red, 6, 5, matureAge);
		const stranger = { ...at(6, 6), parents: [-2, -3] as const, lifetime: 10 };
		const { gain, fed } = capture(world([red, far, grown, stranger], [at(5, 5, 800)]));
		expect(gain.get(red)).toBe(800);
		expect(fed.size).toBe(0);
	});

	it("feeds no child that is caught this step", () => {
		const red = at(5, 5);
		const kid = childOf(red, 6, 5);
		const blue = at(6, 5);
		const { gain, fed } = capture(world([red, kid], [at(5, 5, 800)], [blue]));
		expect(gain.get(red)).toBe(800);
		expect(fed.has(kid)).toBe(false);
	});
});
