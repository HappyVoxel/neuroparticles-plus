import { describe, expect, it } from "vitest";
import { nextTrack } from "./sound";

describe("nextTrack", () => {
	it("picks any track when none is playing", () => {
		expect(nextTrack(-1, 5, () => 0)).toBe(0);
		expect(nextTrack(-1, 5, () => 0.99)).toBe(4);
	});

	it("never repeats the current track", () => {
		for (let current = 0; current < 5; current++) {
			for (let r = 0; r < 1; r += 0.05) {
				const next = nextTrack(current, 5, () => r);
				expect(next).not.toBe(current);
				expect(next).toBeGreaterThanOrEqual(0);
				expect(next).toBeLessThan(5);
			}
		}
	});

	it("reaches every other track", () => {
		const seen = new Set([0, 0.25, 0.5, 0.75].map((r) => nextTrack(2, 5, () => r)));
		expect([...seen].sort()).toEqual([0, 1, 3, 4]);
	});

	it("stays on the only track", () => {
		expect(nextTrack(0, 1)).toBe(0);
	});
});
