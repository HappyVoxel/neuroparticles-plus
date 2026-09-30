import type { Ref } from "react";
import { cellPixels, gridHeight, gridWidth } from "@/sim/config";

interface SimCanvasProps {
	canvasRef: Ref<HTMLCanvasElement>;
}

/**
 * The sim canvas, square and as wide as its container. Its pixel size starts at the grid's
 * drawing size; `useSimulation` then matches it to the screen's pixels.
 */
export function SimCanvas({ canvasRef }: SimCanvasProps) {
	return (
		<canvas
			ref={canvasRef}
			width={gridWidth * cellPixels}
			height={gridHeight * cellPixels}
			aria-label="Simulation field: red, green and blue dots on a black grid"
			className="block aspect-square w-full bg-black ring-1 ring-border"
		/>
	);
}
