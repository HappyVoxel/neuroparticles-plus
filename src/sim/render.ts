import { hpOpacity, oklchCss, shadeAt } from "./color";
import { cellPixels, gridHeight, gridWidth } from "./config";
import { slide } from "./movement";
import type { Species } from "./types";

// Ages are rounded to this many colors per species, so `fillStyle` repeats the same few strings.
const ageSteps = 64;

/**
 * Paints every agent `t` (0–1) of the way through its last move. A dot's shade tracks its age,
 * from the species' lightest shade at birth to its darkest for the species' oldest living dot,
 * and its opacity tracks HP. Colors add up where dots overlap.
 */
export function draw(ctx: CanvasRenderingContext2D, species: readonly Species[], t: number): void {
	ctx.globalCompositeOperation = "source-over";
	ctx.globalAlpha = 1;
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect(0, 0, gridWidth * cellPixels, gridHeight * cellPixels);

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
