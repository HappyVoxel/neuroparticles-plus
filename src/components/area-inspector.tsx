import { XIcon } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
} from "@/components/ui/popover";
import type { SpeciesStats } from "@/hooks/use-simulation";
import { formatCount } from "@/lib/format";
import { type Area, type Cell, areaFromCorners } from "@/sim/area";
import { gridHeight, gridWidth } from "@/sim/config";

interface AreaInspectorProps {
	area: Area | null;
	/** Stats for the agents inside `area`, one entry per species. */
	species: readonly SpeciesStats[] | null;
	onInspect: (area: Area | null) => void;
}

/** The grid cell under the pointer; may fall outside the grid while a drag leaves the canvas. */
function cellAt(e: PointerEvent<HTMLElement>): Cell {
	const box = e.currentTarget.getBoundingClientRect();
	return [
		Math.floor(((e.clientX - box.left) / box.width) * gridWidth),
		Math.floor(((e.clientY - box.top) / box.height) * gridHeight),
	];
}

const percent = (cells: number, total: number): string => `${(cells / total) * 100}%`;

/**
 * Sits on top of the canvas. Dragging frames an area in yellow and opens its live stats beside it.
 * A click on the canvas, the X button or Escape closes it; clicks elsewhere on the page don't, so
 * Run, Pause and Step keep working while the stats are open.
 */
export function AreaInspector({ area, species, onInspect }: AreaInspectorProps) {
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
		// A click without a drag only closes what was open.
		if (next.x0 !== next.x1 || next.y0 !== next.y1) onInspect(next);
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
				className="absolute inset-0 cursor-crosshair touch-none"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerCancel}
			>
				{shown && (
					<PopoverAnchor asChild>
						<div
							className="pointer-events-none absolute border border-yellow-400"
							style={{
								left: percent(shown.x0, gridWidth),
								top: percent(shown.y0, gridHeight),
								width: percent(shown.x1 - shown.x0 + 1, gridWidth),
								height: percent(shown.y1 - shown.y0 + 1, gridHeight),
							}}
						/>
					</PopoverAnchor>
				)}
			</div>
			{area && species && (
				<PopoverContent
					side="right"
					align="start"
					sideOffset={8}
					aria-label="Area stats"
					className="w-60 gap-3 text-xs"
					onOpenAutoFocus={(e) => e.preventDefault()}
					onInteractOutside={(e) => e.preventDefault()}
				>
					<div className="flex items-start justify-between gap-3">
						<PopoverHeader>
							<PopoverTitle>
								Area {area.x1 - area.x0 + 1} × {area.y1 - area.y0 + 1}
							</PopoverTitle>
							<PopoverDescription className="text-xs tabular-nums">
								{formatCount(total)} {total === 1 ? "dot" : "dots"}
							</PopoverDescription>
						</PopoverHeader>
						<Button
							variant="ghost"
							size="icon-xs"
							className="-mt-1.5 -mr-1.5 text-muted-foreground"
							aria-label="Close area stats"
							onClick={() => onInspect(null)}
						>
							<XIcon />
						</Button>
					</div>
					<table className="w-full tabular-nums">
						<thead className="text-muted-foreground">
							<tr>
								<th className="pb-1 text-left font-normal">Species</th>
								<th className="pb-1 text-right font-normal">Dots</th>
								<th className="pb-1 text-right font-normal">Avg age</th>
								<th className="pb-1 text-right font-normal">Avg HP</th>
							</tr>
						</thead>
						<tbody>
							{species.map((s) => (
								<tr key={s.id}>
									<td className="py-0.5">
										<span className="flex items-center gap-2 font-medium">
											<span
												aria-hidden
												className="size-2 shrink-0"
												style={{ backgroundColor: s.color }}
											/>
											{s.name}
										</span>
									</td>
									<td className="py-0.5 text-right">{formatCount(s.population)}</td>
									<td className="py-0.5 text-right">
										{s.population > 0 ? formatCount(Math.round(s.averageAge)) : "–"}
									</td>
									<td className="py-0.5 text-right">
										{s.population > 0 ? formatCount(Math.round(s.averageHp)) : "–"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</PopoverContent>
			)}
		</Popover>
	);
}
