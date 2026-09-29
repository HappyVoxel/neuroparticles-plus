import { cellPixels, gridHeight, gridWidth } from "./config";
import type { Species } from "./types";

/** Paints each occupied cell with the sum of the colors present there (so R+G shows yellow). */
export function draw(ctx: CanvasRenderingContext2D, species: readonly Species[]): void {
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect(0, 0, gridWidth * cellPixels, gridHeight * cellPixels);

	for (let x = 0; x < gridWidth; x++) {
		for (let y = 0; y < gridHeight; y++) {
			let r = 0;
			let g = 0;
			let b = 0;
			for (const { field, color } of species) {
				if (field[x][y] > 0) {
					r += color[0];
					g += color[1];
					b += color[2];
				}
			}
			if (r || g || b) {
				ctx.fillStyle = `rgb(${Math.min(r, 255)},${Math.min(g, 255)},${Math.min(b, 255)})`;
				ctx.fillRect(x * cellPixels, y * cellPixels, cellPixels, cellPixels);
			}
		}
	}
}
