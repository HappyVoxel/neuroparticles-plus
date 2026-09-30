import { describe, expect, it } from "vitest";
import { capture } from "./capture";
import { speciesDefs } from "./config";
import { buildField } from "./field";
import type { Agent, Species } from "./types";

const at = (x: number, y: number, hp = 1000): Agent => ({
	genome: [],
	hp,
	x,
	y,
	prevX: x,
	prevY: y,
	lifetime: 0,
	kills: 0,
});

// Red, Green, Blue in order: each catches the next one.
const world = (...agents: Agent[][]): Species[] =>
	speciesDefs.map((def, i) => ({
		...def,
		agents: agents[i] ?? [],
		field: buildField(agents[i] ?? []),
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
		expect([...caught]).toEqual([green]);
		expect(gain.get(red)).toBe(700);
	});

	it("follows the loop: Green catches Blue, Blue catches Red, never the other way", () => {
		const red = at(5, 5);
		const green = at(9, 9);
		const blueOnRed = at(5, 5, 400);
		const blueOnGreen = at(9, 9, 600);
		const { caught, gain } = capture(world([red], [green], [blueOnRed, blueOnGreen]));
		expect(caught).toEqual(new Set([red, blueOnGreen]));
		expect(gain.get(blueOnRed)).toBe(1000);
		expect(gain.get(green)).toBe(600);
		expect(gain.has(red)).toBe(false);
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
		expect(caught).toEqual(new Set([red, green, blue]));
		expect(gain.get(red)).toBe(800);
		expect(gain.get(green)).toBe(600);
		expect(gain.get(blue)).toBe(1000);
	});
});
