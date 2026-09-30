import {
	allTopDots,
	defaultMutation,
	defaultStepsPerSecond,
	hpPenaltyFromWall,
	maxStepsPerSecond,
	maxWallPenalty,
	minStepsPerSecond,
	speciesDefs,
	wallPenaltyStep,
} from "@/sim/config";
import { genomeSize } from "@/sim/network";
import type { MutationParams, TopDotsFilter } from "@/sim/types";

/** The sidebar settings that survive a page refresh. */
export interface SimSettings {
	mutation: MutationParams;
	wallPenalty: number;
	stepsPerSecond: number;
	topDots: TopDotsFilter;
}

const keys = {
	stepsPerSecond: "speed",
	wallPenalty: "wall-penalty",
	percent: "mutation-percent",
	genes: "mutation-genes",
	dead: "top-dots-dead",
	/** Ids of the species shown, comma-separated: "R,G,B". */
	species: "top-dots-species",
} as const;

/** The stored whole number when it lies in [min, max] and on the step grid; `fallback` otherwise. */
function wholeIn(
	text: string | null,
	min: number,
	max: number,
	fallback: number,
	step = 1,
): number {
	if (text === null || text.trim() === "") return fallback;
	const value = Number(text);
	const onGrid = Number.isInteger(value) && Number.isInteger((value - min) / step);
	return onGrid && value >= min && value <= max ? value : fallback;
}

function topDotsFilter(dead: string | null, species: string | null): TopDotsFilter {
	const shown = species === null ? null : new Set(species.split(","));
	return {
		dead: dead === "on" || dead === "off" ? dead === "on" : allTopDots.dead,
		species: shown === null ? allTopDots.species : speciesDefs.map(({ id }) => shown.has(id)),
	};
}

/** Reads the saved settings; each missing or invalid value falls back to its default. */
export function loadSimSettings(read: (key: string) => string | null): SimSettings {
	return {
		mutation: {
			percent: wholeIn(read(keys.percent), 0, 100, defaultMutation.percent),
			genes: wholeIn(read(keys.genes), 1, genomeSize, defaultMutation.genes),
		},
		wallPenalty: wholeIn(
			read(keys.wallPenalty),
			0,
			maxWallPenalty,
			hpPenaltyFromWall,
			wallPenaltyStep,
		),
		stepsPerSecond: wholeIn(
			read(keys.stepsPerSecond),
			minStepsPerSecond,
			maxStepsPerSecond,
			defaultStepsPerSecond,
			// The Speed slider moves in steps of its minimum.
			minStepsPerSecond,
		),
		topDots: topDotsFilter(read(keys.dead), read(keys.species)),
	};
}

export function saveSimSettings(
	settings: SimSettings,
	write: (key: string, value: string) => void,
): void {
	write(keys.percent, String(settings.mutation.percent));
	write(keys.genes, String(settings.mutation.genes));
	write(keys.wallPenalty, String(settings.wallPenalty));
	write(keys.stepsPerSecond, String(settings.stepsPerSecond));
	write(keys.dead, settings.topDots.dead ? "on" : "off");
	write(
		keys.species,
		speciesDefs
			.filter((_, i) => settings.topDots.species[i])
			.map(({ id }) => id)
			.join(","),
	);
}
