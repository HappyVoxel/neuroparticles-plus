import type { SpeciesStats } from "@/hooks/use-simulation";
import { percent } from "@/lib/format";
import {
	diseaseLabelEmPerChar,
	diseaseLabelFade,
	diseaseLabelGap,
	diseaseLabelMinCells,
	diseaseLabelMs,
	diseaseLabelSizeRatio,
	gridHeight,
	gridWidth,
} from "@/sim/config";
import type { DiseaseArea } from "@/sim/types";

/** A label to show, in cells: centered on `x`, its bottom edge on `bottom`, `size` cells tall. */
export interface DiseaseLabel {
	key: string;
	text: "Disease!" | "Pandemic!";
	species: number;
	x: number;
	bottom: number;
	size: number;
	opacity: number;
}

interface Box {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

const overlap = (a: Box, b: Box): boolean =>
	a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * The labels to show at `step`: "Disease!" from an area's birth, "Pandemic!" from the step it
 * became one, each for `diseaseLabelMs` at `stepsPerSecond`, fading over the last part. Its size
 * follows the area's radius, and it sits just above the area, kept inside the grid. Pandemics go
 * first, then the older labels, and a label that would come within `diseaseLabelGap` of one
 * already placed is left out, so a burst of areas in one spot shows one label.
 */
export function diseaseLabels(
	areas: readonly DiseaseArea[],
	step: number,
	stepsPerSecond: number,
): DiseaseLabel[] {
	const lifeSteps = (stepsPerSecond * diseaseLabelMs) / 1000;
	const live = areas
		.map((area) => ({ area, since: area.pandemicStep ?? area.bornStep }))
		.filter(({ since }) => step - since < lifeSteps);
	live.sort(
		(a, b) =>
			Number(b.area.pandemicStep !== null) - Number(a.area.pandemicStep !== null) ||
			a.since - b.since ||
			a.area.id - b.area.id,
	);

	const placed: Box[] = [];
	const labels: DiseaseLabel[] = [];
	for (const { area, since } of live) {
		const text = area.pandemicStep === null ? "Disease!" : "Pandemic!";
		const size = Math.max(diseaseLabelMinCells, area.radius * diseaseLabelSizeRatio);
		const half = (text.length * diseaseLabelEmPerChar * size) / 2;
		const x = Math.min(Math.max(area.x + 0.5, half), gridWidth - half);
		const bottom = Math.min(Math.max(area.y - area.radius, size), gridHeight);
		const gap = diseaseLabelGap * size;
		const box = {
			left: x - half - gap,
			right: x + half + gap,
			top: bottom - size - gap,
			bottom: bottom + gap,
		};
		if (placed.some((p) => overlap(p, box))) continue;
		placed.push(box);
		const left = 1 - (step - since) / lifeSteps;
		labels.push({
			key: `${area.id}-${text}`,
			text,
			species: area.species,
			x,
			bottom,
			size,
			opacity: Math.min(1, left / diseaseLabelFade),
		});
	}
	return labels;
}

interface DiseaseLabelsProps {
	areas: readonly DiseaseArea[];
	/** Stats per species, for each label's color. */
	species: readonly SpeciesStats[];
	step: number;
	stepsPerSecond: number;
}

/**
 * Over the canvas, the `diseaseLabels` in their species' color with a white outline. Sizes are in
 * container units, so they scale with the canvas.
 */
export function DiseaseLabels({ areas, species, step, stepsPerSecond }: DiseaseLabelsProps) {
	return (
		<div aria-hidden className="@container pointer-events-none absolute inset-0 overflow-hidden">
			{diseaseLabels(areas, step, stepsPerSecond).map(
				({ key, text, species: owner, x, bottom, size, opacity }) => (
					<div
						key={key}
						className="absolute -translate-x-1/2 -translate-y-full transition-opacity duration-200"
						style={{ left: percent(x, gridWidth), top: percent(bottom, gridHeight), opacity }}
					>
						<span
							className="block origin-bottom animate-disease-label font-display leading-none whitespace-nowrap [-webkit-text-stroke:2px_white] [paint-order:stroke_fill]"
							style={{
								color: species[owner]?.color,
								fontSize: `${(size / gridWidth) * 100}cqw`,
							}}
						>
							{text}
						</span>
					</div>
				),
			)}
		</div>
	);
}
