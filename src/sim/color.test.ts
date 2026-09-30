import { describe, expect, it } from "vitest";
import { hpOpacity, oklchCss, shadeAt } from "./color";
import { speciesDefs, startHp } from "./config";
import type { Oklch } from "./types";

describe("shadeAt", () => {
	const shades: Oklch[] = [
		[0.8, 0.1, 20],
		[0.6, 0.2, 24],
		[0.4, 0.3, 28],
	];

	it("starts at the first shade and ends at the last", () => {
		expect(shadeAt(shades, 0)).toEqual(shades[0]);
		expect(shadeAt(shades, 1)).toEqual(shades[2]);
	});

	it("lands on the middle shade halfway", () => {
		expect(shadeAt(shades, 0.5)).toEqual(shades[1]);
	});

	it("blends the two nearest shades in between", () => {
		const [l, c, h] = shadeAt(shades, 0.25);
		expect(l).toBeCloseTo(0.7);
		expect(c).toBeCloseTo(0.15);
		expect(h).toBeCloseTo(22);
	});

	it("clamps outside 0–1", () => {
		expect(shadeAt(shades, -1)).toEqual(shades[0]);
		expect(shadeAt(shades, 2)).toEqual(shades[2]);
	});

	it("puts every species' 500 shade in the middle of its scale", () => {
		const red500: Oklch = [0.637, 0.237, 25.331];
		expect(shadeAt(speciesDefs[0].shades, 0.5)).toEqual(red500);
	});
});

describe("hpOpacity", () => {
	it("is 0 at 0 HP and 1 at full HP", () => {
		expect(hpOpacity(0)).toBe(0);
		expect(hpOpacity(startHp)).toBe(1);
	});

	it("scales in between", () => {
		expect(hpOpacity(startHp / 4)).toBeCloseTo(0.25);
	});

	it("stays at 1 above full HP", () => {
		expect(hpOpacity(startHp * 3)).toBe(1);
	});
});

describe("oklchCss", () => {
	it("writes a CSS color", () => {
		expect(oklchCss([0.637, 0.237, 25.331])).toBe("oklch(0.637 0.237 25.331)");
	});

	it("adds the alpha below 1", () => {
		expect(oklchCss([0.637, 0.237, 25.331], 0.5)).toBe("oklch(0.637 0.237 25.331 / 0.5)");
	});
});
