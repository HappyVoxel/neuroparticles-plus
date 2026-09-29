import { cellPixels, gridHeight, gridWidth } from "./config";
import { slide } from "./movement";
import type { Species } from "./types";

/**
 * Paints every agent `t` (0–1) of the way through its last move. Colors add up where dots
 * overlap (so R+G shows yellow).
 */
export function draw(ctx: CanvasRenderingContext2D, species: readonly Species[], t: number): void {
	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect(0, 0, gridWidth * cellPixels, gridHeight * cellPixels);

	ctx.globalCompositeOperation = "lighter";
	for (const { agents, color } of species) {
		ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
		for (let i = 0; i < agents.length; i++) {
			const { x, y, prevX, prevY } = agents[i];
			ctx.fillRect(
				slide(prevX, x, t) * cellPixels,
				slide(prevY, y, t) * cellPixels,
				cellPixels,
				cellPixels,
			);
		}
	}
}
