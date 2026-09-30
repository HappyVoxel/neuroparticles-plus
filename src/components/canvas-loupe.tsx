import { type RefObject, useEffect, useRef } from "react";
import { gridWidth, loupeDiameterPx, loupeZoom } from "@/sim/config";

interface CanvasLoupeProps {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	on: boolean;
}

// Crosshair ticks start this many CSS px outside the aimed cell and run `tickLength` px.
const tickGap = 2;
const tickLength = 6;

/**
 * A round magnifier that follows the pointer over the sim canvas and shows it `loupeZoom`× bigger,
 * with a crosshair on the cell a click hits. It never takes pointer events, so the area inspector
 * underneath still gets every click and drag. While off it renders nothing and runs no loop.
 */
export function CanvasLoupe({ canvasRef, on }: CanvasLoupeProps) {
	const loupeRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const loupe = loupeRef.current;
		const ctx = loupe?.getContext("2d");
		if (!on || !loupe || !ctx) return;

		// Client coordinates of the pointer; null once it leaves the window.
		let pointer: { x: number; y: number } | null = null;
		const onMove = (e: PointerEvent) => {
			pointer = { x: e.clientX, y: e.clientY };
		};
		const onOut = (e: PointerEvent) => {
			if (e.relatedTarget === null) pointer = null;
		};

		let frame = 0;
		const draw = () => {
			frame = requestAnimationFrame(draw);
			const source = canvasRef.current;
			const box = source?.getBoundingClientRect();
			const inside =
				pointer !== null &&
				box !== undefined &&
				pointer.x >= box.left &&
				pointer.x < box.right &&
				pointer.y >= box.top &&
				pointer.y < box.bottom;
			loupe.hidden = !inside;
			if (!inside || !source || !box || !pointer) return;

			const radius = loupeDiameterPx / 2;
			loupe.style.left = `${pointer.x - radius}px`;
			loupe.style.top = `${pointer.y - radius}px`;

			const size = Math.round(loupeDiameterPx * window.devicePixelRatio);
			if (loupe.width !== size) {
				loupe.width = size;
				loupe.height = size;
			}

			// The square of source pixels around the pointer that fills the loupe.
			const scale = source.width / box.width;
			const span = (loupeDiameterPx / loupeZoom) * scale;
			const sx = (pointer.x - box.left) * scale - span / 2;
			const sy = (pointer.y - box.top) * scale - span / 2;

			ctx.imageSmoothingEnabled = false;
			ctx.fillStyle = "black";
			ctx.fillRect(0, 0, size, size);
			ctx.drawImage(source, sx, sy, span, span, 0, 0, size, size);

			// Four ticks around the center, leaving the aimed cell clear.
			const px = size / loupeDiameterPx;
			const center = size / 2;
			const inner = ((box.width / gridWidth) * loupeZoom * px) / 2 + tickGap * px;
			const outer = inner + tickLength * px;
			ctx.strokeStyle = "rgba(245, 245, 245, 0.9)";
			ctx.lineWidth = px;
			ctx.beginPath();
			ctx.moveTo(center - outer, center);
			ctx.lineTo(center - inner, center);
			ctx.moveTo(center + inner, center);
			ctx.lineTo(center + outer, center);
			ctx.moveTo(center, center - outer);
			ctx.lineTo(center, center - inner);
			ctx.moveTo(center, center + inner);
			ctx.lineTo(center, center + outer);
			ctx.stroke();
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerout", onOut);
		frame = requestAnimationFrame(draw);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerout", onOut);
		};
	}, [on, canvasRef]);

	if (!on) return null;
	return (
		<canvas
			ref={loupeRef}
			hidden
			aria-hidden
			className="pointer-events-none fixed z-50 rounded-full shadow-lg ring-1 ring-white/70"
			style={{ width: loupeDiameterPx, height: loupeDiameterPx }}
		/>
	);
}
