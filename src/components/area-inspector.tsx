import { type PointerEvent, useRef, useState } from "react";
import { CanvasPopover, cellBox } from "@/components/canvas-popover";
import { SpeciesSwatch } from "@/components/species-swatch";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import type { SpeciesStats } from "@/hooks/use-simulation";
import { formatCount } from "@/lib/format";
import { speciesDisplay } from "@/lib/species";
import { type Area, areaFromCorners } from "@/sim/area";
import { gridHeight, gridWidth } from "@/sim/config";
import type { Cell } from "@/sim/types";

interface AreaInspectorProps {
	area: Area | null;
	/** Stats for the agents inside `area`, one entry per species. */
	species: readonly SpeciesStats[] | null;
	onInspect: (area: Area | null) => void;
	/** A click without a drag, with the clicked cell: follows the dot nearest to it. */
	onPick: (x: number, y: number) => void;
	/** True while the loupe is on; it draws its own crosshair, so the cursor hides. */
	precise: boolean;
}

/** The grid cell under the pointer; may fall outside the grid while a drag leaves the canvas. */
function cellAt(e: PointerEvent<HTMLElement>): Cell {
	const box = e.currentTarget.getBoundingClientRect();
	return {
		x: Math.floor(((e.clientX - box.left) / box.width) * gridWidth),
		y: Math.floor(((e.clientY - box.top) / box.height) * gridHeight),
	};
}

/**
 * Sits on top of the canvas. Dragging frames an area in yellow and opens its live stats beside it.
 * A click without a drag picks the dot under it through `onPick`. A click on the canvas, the X
 * button or Escape closes the area; clicks elsewhere on the page don't, so Run, Pause and Step
 * keep working while the stats are open.
 */
export function AreaInspector({ area, species, onInspect, onPick, precise }: AreaInspectorProps) {
	const startRef = useRef<Cell | null>(null);
	const [draft, setDraft] = useState<Area | null>(null);
	const shown = draft ?? area;

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		// Stops text selection on the page while the drag runs past the canvas.
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		startRef.current = cellAt(e);
		setDraft(areaFromCorners(startRef.current, startRef.current));
		onInspect(null);
	};

	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (startRef.current) setDraft(areaFromCorners(startRef.current, cellAt(e)));
	};

	const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
		if (!startRef.current) return;
		const next = areaFromCorners(startRef.current, cellAt(e));
		startRef.current = null;
		setDraft(null);
		// A click without a drag closed the area on pointer down; now it picks a dot.
		if (next.x0 !== next.x1 || next.y0 !== next.y1) onInspect(next);
		else onPick(next.x0, next.y0);
	};

	const onPointerCancel = () => {
		startRef.current = null;
		setDraft(null);
	};

	const total = species?.reduce((sum, s) => sum + s.population, 0) ?? 0;

	return (
		<Popover
			open={area !== null && draft === null}
			onOpenChange={(open) => {
				if (!open) onInspect(null);
			}}
		>
			<div
				aria-hidden
				className={`absolute inset-0 touch-none ${precise ? "cursor-none" : "cursor-crosshair"}`}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerCancel}
			>
				{shown && (
					<PopoverAnchor asChild>
						<div
							className="pointer-events-none absolute border border-yellow-400"
							style={cellBox(shown.x0, shown.y0, shown.x1 - shown.x0 + 1, shown.y1 - shown.y0 + 1)}
						/>
					</PopoverAnchor>
				)}
			</div>
			{area && species && (
				<CanvasPopover
					side="right"
					aria-label="Area stats"
					title={
						<>
							Area {area.x1 - area.x0 + 1} × {area.y1 - area.y0 + 1}
						</>
					}
					description={
						<>
							{formatCount(total)} {total === 1 ? "dot" : "dots"}
						</>
					}
					closeLabel="Close area stats"
					onClose={() => onInspect(null)}
				>
					<table className="w-full tabular-nums">
						<thead className="text-muted-foreground">
							<tr>
								<th className="pb-1 text-left font-normal">Species</th>
								<th className="pb-1 text-right font-normal">Dots</th>
								<th className="pb-1 text-right font-normal">Avg age</th>
								<th className="pb-1 text-right font-normal">Avg HP</th>
								<th className="pb-1 text-right font-normal">Top kills</th>
							</tr>
						</thead>
						<tbody>
							{species.map((s, i) => (
								<tr key={speciesDisplay[i].name}>
									<td className="py-0.5">
										<span className="flex items-center gap-2 font-medium">
											<SpeciesSwatch species={i} />
											{speciesDisplay[i].name}
										</span>
									</td>
									<td className="py-0.5 text-right">{formatCount(s.population)}</td>
									<td className="py-0.5 text-right">
										{s.population > 0 ? formatCount(Math.round(s.averageAge)) : "–"}
									</td>
									<td className="py-0.5 text-right">
										{s.population > 0 ? formatCount(Math.round(s.averageHp)) : "–"}
									</td>
									<td className="py-0.5 text-right">
										{s.population > 0 ? formatCount(s.topKills) : "–"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</CanvasPopover>
			)}
		</Popover>
	);
}
