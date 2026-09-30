import { hpOpacity, oklchCss, shadeAt } from "./color";
import {
	ageColorSteps,
	cellPixels,
	diseaseOpacity,
	followRingColor,
	gridHeight,
	gridWidth,
} from "./config";
import { slide } from "./movement";
import type { DiseaseArea, Species } from "./types";

/**
 * Paints the disease areas, each in the 300 shade of the species that crowded it; one species'
 * areas are filled as one shape, so their overlaps don't darken. Then paints every agent
 * `t` (0–1) of the way through its last move. A dot's shade tracks its age, from the species'
 * lightest shade at birth to its darkest for the species' oldest living dot, and its opacity
 * tracks HP. Colors add up where dots overlap. Last, rings the dot with id `followId` while it
 * lives.
 */
export function draw(
	ctx: CanvasRenderingContext2D,
	species: readonly Species[],
	diseaseAreas: readonly DiseaseArea[],
	t: number,
	followId: number | null = null,
): void {
	ctx.globalCompositeOperation = "source-over";
	ctx.globalAlpha = 1;
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect(0, 0, gridWidth * cellPixels, gridHeight * cellPixels);

	ctx.globalAlpha = diseaseOpacity;
	species.forEach(({ shades }, s) => {
		ctx.beginPath();
		for (const { x, y, radius, species: owner } of diseaseAreas) {
			if (owner !== s) continue;
			const cx = (x + 0.5) * cellPixels;
			const cy = (y + 0.5) * cellPixels;
			const r = radius * cellPixels;
			ctx.moveTo(cx + r, cy);
			ctx.arc(cx, cy, r, 0, 2 * Math.PI);
		}
		ctx.fillStyle = oklchCss(shades[0]);
		ctx.fill("nonzero");
	});
	ctx.globalAlpha = 1;

	ctx.globalCompositeOperation = "lighter";
	let followed: { x: number; y: number } | null = null;
	for (const { agents, shades } of species) {
		const colors = Array.from({ length: ageColorSteps }, (_, k) =>
			oklchCss(shadeAt(shades, k / (ageColorSteps - 1))),
		);
		let oldest = 0;
		for (let i = 0; i < agents.length; i++) oldest = Math.max(oldest, agents[i].lifetime);

		for (let i = 0; i < agents.length; i++) {
			const { id, x, y, prevX, prevY, lifetime, hp } = agents[i];
			const age = oldest > 0 ? lifetime / oldest : 0;
			const px = slide(prevX, x, t) * cellPixels;
			const py = slide(prevY, y, t) * cellPixels;
			ctx.fillStyle = colors[Math.round(age * (ageColorSteps - 1))];
			ctx.globalAlpha = hpOpacity(hp);
			ctx.fillRect(px, py, cellPixels, cellPixels);
			if (id === followId) followed = { x: px, y: py };
		}
	}
	ctx.globalAlpha = 1;

	if (followed) {
		ctx.globalCompositeOperation = "source-over";
		ctx.strokeStyle = oklchCss(followRingColor);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(
			followed.x + cellPixels / 2,
			followed.y + cellPixels / 2,
			cellPixels * 2,
			0,
			2 * Math.PI,
		);
		ctx.stroke();
	}
}
