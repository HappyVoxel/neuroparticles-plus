import { describe, expect, it } from "vitest";
import {
	defaultMutation,
	defaultStepsPerSecond,
	hpPenaltyFromWall,
	maxStepsPerSecond,
	maxWallPenalty,
} from "@/sim/config";
import { genomeSize } from "@/sim/network";
import { loadSimSettings, saveSimSettings } from "./sim-settings";

const defaults = {
	mutation: defaultMutation,
	wallPenalty: hpPenaltyFromWall,
	stepsPerSecond: defaultStepsPerSecond,
};

const from =
	(values: Record<string, string>) =>
	(key: string): string | null =>
		values[key] ?? null;

describe("loadSimSettings", () => {
	it("uses the defaults when nothing is saved", () => {
		expect(loadSimSettings(() => null)).toEqual(defaults);
	});

	it("reads back what saveSimSettings wrote", () => {
		const saved = {
			mutation: { percent: 40, genes: 7 },
			wallPenalty: 300,
			stepsPerSecond: 55,
		};
		const store: Record<string, string> = {};
		saveSimSettings(saved, (key, value) => {
			store[key] = value;
		});
		expect(loadSimSettings(from(store))).toEqual(saved);
	});

	it("keeps the edges of each range", () => {
		const settings = loadSimSettings(
			from({
				"mutation-percent": "0",
				"mutation-genes": String(genomeSize),
				"wall-penalty": String(maxWallPenalty),
				speed: String(maxStepsPerSecond),
			}),
		);
		expect(settings).toEqual({
			mutation: { percent: 0, genes: genomeSize },
			wallPenalty: maxWallPenalty,
			stepsPerSecond: maxStepsPerSecond,
		});
	});

	it.each([
		[
			"out of range",
			{ "mutation-percent": "101", "mutation-genes": "0", "wall-penalty": "-100", speed: "200" },
		],
		["off the slider grid", { "mutation-percent": "2.5", "wall-penalty": "150", speed: "23" }],
		[
			"not numbers",
			{
				"mutation-percent": "lots",
				"mutation-genes": "",
				"wall-penalty": "NaN",
				speed: "Infinity",
			},
		],
	])("falls back to the defaults for values %s", (_, values) => {
		expect(loadSimSettings(from(values))).toEqual(defaults);
	});
});
