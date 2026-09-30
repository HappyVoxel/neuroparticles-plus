import { hpOpacity, oklchCss, shadeAt } from "./color";
import {
	ageColorSteps,
	cellPixels,
	diseaseOpacity,
	followRingColor,
	glowCoreCells,
	glowDiagonalRatio,
	glowMaxCells,
	glowMaxOpacity,
	glowMinCells,
	glowMinOpacity,
	glowPeriodMs,
	glowRayWidthCells,
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
 * tracks HP. Colors add up where dots overlap. Then a pulsing star in its species' lightest shade
 * lights each dot in `glowIds` (one id or null per species), timed by `now` in ms. Last, rings the
 * dot with id `followId` while it lives.
 */
export function draw(
	ctx: CanvasRenderingContext2D,
	species: readonly Species[],
	diseaseAreas: readonly DiseaseArea[],
	t: number,
	followId: number | null,
	glowIds: readonly (number | null)[],
	now: number,
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
		const colors = ageColors(shades);
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

	// 0 at the shortest rays, 1 at the longest.
	const pulse = (1 - Math.cos((2 * Math.PI * now) / glowPeriodMs)) / 2;
	const length = (glowMinCells + (glowMaxCells - glowMinCells) * pulse) * cellPixels;
	const opacity = glowMinOpacity + (glowMaxOpacity - glowMinOpacity) * pulse;
	for (const { x, y, color } of glows) {
		drawStar(
			ctx,
			x + cellPixels / 2,
			y + cellPixels / 2,
			length,
			oklchCss(color, opacity),
			oklchCss(color, 0),
		);
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

// Each species' `ageColorSteps` CSS colors, youngest first, built once per list of shades.
const ageColorCache = new WeakMap<readonly Oklch[], readonly string[]>();

function ageColors(shades: readonly Oklch[]): readonly string[] {
	let colors = ageColorCache.get(shades);
	if (!colors) {
		colors = Array.from({ length: ageColorSteps }, (_, k) =>
			oklchCss(shadeAt(shades, k / (ageColorSteps - 1))),
		);
		ageColorCache.set(shades, colors);
	}
	return colors;
}

/**
 * A twinkle centered on (cx, cy): a soft round core and eight rays that fade from `bright` at the
 * center to `clear` at their tips, the straight ones `length` long, the diagonals shorter.
 */
function drawStar(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	length: number,
	bright: string,
	clear: string,
): void {
	const core = glowCoreCells * cellPixels;
	const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, core);
	coreGradient.addColorStop(0, bright);
	coreGradient.addColorStop(1, clear);
	ctx.fillStyle = coreGradient;
	ctx.fillRect(cx - core, cy - core, 2 * core, 2 * core);

	const halfWidth = (glowRayWidthCells * cellPixels) / 2;
	ctx.save();
	ctx.translate(cx, cy);
	for (let k = 0; k < 8; k++) {
		// Rays point along +x before turning; even k are straight, odd k diagonal.
		const ray = k % 2 === 0 ? length : length * glowDiagonalRatio;
		const gradient = ctx.createLinearGradient(0, 0, ray, 0);
		gradient.addColorStop(0, bright);
		gradient.addColorStop(1, clear);
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.moveTo(0, -halfWidth);
		ctx.lineTo(ray, 0);
		ctx.lineTo(0, halfWidth);
		ctx.closePath();
		ctx.fill();
		ctx.rotate(Math.PI / 4);
	}
	ctx.restore();
}
