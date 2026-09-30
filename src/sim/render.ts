import { hpOpacity, oklchCss, shadeAt } from "./color";
import {
	ageColorSteps,
	cellPixels,
	diseaseOpacity,
	followRingColor,
	glowMaxCells,
	glowMaxOpacity,
	glowMinCells,
	glowMinOpacity,
	glowPeriodMs,
	gridHeight,
	gridWidth,
} from "./config";
import { slide } from "./movement";
import type { DiseaseArea, Oklch, Species } from "./types";

/**
 * Paints the disease areas, each in the 300 shade of the species that crowded it; one species'
 * areas are filled as one shape, so their overlaps don't darken. Then paints every agent
 * `t` (0–1) of the way through its last move. A dot's shade tracks its age, from the species'
 * lightest shade at birth to its darkest for the species' oldest living dot, and its opacity
 * tracks HP. Colors add up where dots overlap. Then a pulsing glow in its species' lightest shade
 * lights each dot in `glowIds` (one id or null per species), timed by `now` in ms. Last, rings the
 * dot with id `followId` while it lives.
 */
export function draw(
	ctx: CanvasRenderingContext2D,
	species: readonly Species[],
	diseaseAreas: readonly DiseaseArea[],
	t: number,
	followId: number | null = null,
	glowIds: readonly (number | null)[] = [],
	now = 0,
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
	const glows: { x: number; y: number; color: Oklch }[] = [];
	for (let s = 0; s < species.length; s++) {
		const { agents, shades } = species[s];
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
			if (id === glowIds[s]) glows.push({ x: px, y: py, color: shades[0] });
		}
	}
	ctx.globalAlpha = 1;

	// 0 at the narrowest, 1 at the widest.
	const pulse = (1 - Math.cos((2 * Math.PI * now) / glowPeriodMs)) / 2;
	const radius = (glowMinCells + (glowMaxCells - glowMinCells) * pulse) * cellPixels;
	const opacity = glowMinOpacity + (glowMaxOpacity - glowMinOpacity) * pulse;
	for (const { x, y, color } of glows) {
		const cx = x + cellPixels / 2;
		const cy = y + cellPixels / 2;
		const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
		gradient.addColorStop(0, oklchCss(color, opacity));
		gradient.addColorStop(1, oklchCss(color, 0));
		ctx.fillStyle = gradient;
		ctx.fillRect(cx - radius, cy - radius, 2 * radius, 2 * radius);
	}

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
