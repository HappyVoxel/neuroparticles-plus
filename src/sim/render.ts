import { hpOpacity, oklchCss, shadeAt } from "./color";
import { cellPixels, diseaseOpacity, gridHeight, gridWidth, visionRadiusSquared } from "./config";
import { slide } from "./movement";
import type { DiseaseArea, Species } from "./types";

// Ages are rounded to this many colors per species, so `fillStyle` repeats the same few strings.
const ageSteps = 64;

const diseaseRadius = Math.sqrt(visionRadiusSquared) * cellPixels;

/**
 * Paints the disease areas, each in the 500 shade of the species that crowded it; one species'
 * areas are filled as one shape, so their overlaps don't darken. Then paints every agent
 * `t` (0–1) of the way through its last move. A dot's shade tracks its age, from the species'
 * lightest shade at birth to its darkest for the species' oldest living dot, and its opacity
 * tracks HP. Colors add up where dots overlap.
 */
export function draw(
	ctx: CanvasRenderingContext2D,
	species: readonly Species[],
	diseaseAreas: readonly DiseaseArea[],
	t: number,
): void {
	ctx.globalCompositeOperation = "source-over";
	ctx.globalAlpha = 1;
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect(0, 0, gridWidth * cellPixels, gridHeight * cellPixels);

	ctx.globalAlpha = diseaseOpacity;
	species.forEach(({ shades }, s) => {
		ctx.beginPath();
		for (const { x, y, species: owner } of diseaseAreas) {
			if (owner !== s) continue;
			const cx = (x + 0.5) * cellPixels;
			const cy = (y + 0.5) * cellPixels;
			ctx.moveTo(cx + diseaseRadius, cy);
			ctx.arc(cx, cy, diseaseRadius, 0, 2 * Math.PI);
		}
		ctx.fillStyle = oklchCss(shadeAt(shades, 0.5));
		ctx.fill("nonzero");
	});
	ctx.globalAlpha = 1;

	ctx.globalCompositeOperation = "lighter";
	for (const { agents, shades } of species) {
		const colors = Array.from({ length: ageSteps }, (_, k) =>
			oklchCss(shadeAt(shades, k / (ageSteps - 1))),
		);
		let oldest = 0;
		for (let i = 0; i < agents.length; i++) oldest = Math.max(oldest, agents[i].lifetime);

		for (let i = 0; i < agents.length; i++) {
			const { x, y, prevX, prevY, lifetime, hp } = agents[i];
			const age = oldest > 0 ? lifetime / oldest : 0;
			ctx.fillStyle = colors[Math.round(age * (ageSteps - 1))];
			ctx.globalAlpha = hpOpacity(hp);
			ctx.fillRect(
				slide(prevX, x, t) * cellPixels,
				slide(prevY, y, t) * cellPixels,
				cellPixels,
				cellPixels,
			);
		}
	}
	ctx.globalAlpha = 1;
}
