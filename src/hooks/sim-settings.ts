import { readFlag, writeFlag } from "@/lib/storage";
import {
	allTopDots,
	defaultMutation,
	defaultStepsPerSecond,
	hpPenaltyFromWall,
	maxMutationPercent,
	maxStepsPerSecond,
	maxWallPenalty,
	minMutationGenes,
	minMutationPercent,
	minStepsPerSecond,
	minWallPenalty,
	speciesDefs,
	stepsPerSecondStep,
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

function topDotsFilter(dead: boolean, species: string | null): TopDotsFilter {
	const shown = species === null ? null : new Set(species.split(","));
	return {
		dead,
		species: shown === null ? allTopDots.species : speciesDefs.map(({ id }) => shown.has(id)),
	};
}

/** Reads the saved settings; each missing or invalid value falls back to its default. */
export function loadSimSettings(read: (key: string) => string | null): SimSettings {
	return {
		mutation: {
			percent: wholeIn(
				read(keys.percent),
				minMutationPercent,
				maxMutationPercent,
				defaultMutation.percent,
			),
			genes: wholeIn(read(keys.genes), minMutationGenes, genomeSize, defaultMutation.genes),
		},
		wallPenalty: wholeIn(
			read(keys.wallPenalty),
			minWallPenalty,
			maxWallPenalty,
			hpPenaltyFromWall,
			wallPenaltyStep,
		),
		stepsPerSecond: wholeIn(
			read(keys.stepsPerSecond),
			minStepsPerSecond,
			maxStepsPerSecond,
			defaultStepsPerSecond,
			stepsPerSecondStep,
		),
		topDots: topDotsFilter(readFlag(keys.dead, allTopDots.dead, read), read(keys.species)),
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
	writeFlag(keys.dead, settings.topDots.dead, write);
	write(
		keys.species,
		speciesDefs
			.filter((_, i) => settings.topDots.species[i])
			.map(({ id }) => id)
			.join(","),
	);
}
