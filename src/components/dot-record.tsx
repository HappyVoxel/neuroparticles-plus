import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
} from "@/components/ui/popover";
import { SpeciesSwatch } from "@/components/species-swatch";
import type { DotView } from "@/hooks/use-simulation";
import { formatCount, percent } from "@/lib/format";
import { speciesDisplay } from "@/lib/species";
import { gridHeight, gridWidth } from "@/sim/config";

interface DotRecordProps {
	followed: DotView | null;
	/** The current sim step. */
	step: number;
	onClose: () => void;
	onCopyGenome: () => void;
}

/** How long the Copy button says "Copied". */
const copiedMs = 1500;

const share = (part: number, total: number): string =>
	total > 0 ? `${Math.round((part / total) * 100)}%` : "–";

const ids = (list: readonly number[]): string => list.map((id) => `#${id}`).join(", ");

/** Label and value rows, two columns, one line each so the popover keeps its height. */
function Rows({ rows }: { rows: readonly (readonly [string, string])[] }) {
	return (
		<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
			{rows.map(([label, value]) => (
				<div key={label} className="contents">
					<dt className="whitespace-nowrap text-muted-foreground">{label}</dt>
					<dd className="text-right whitespace-nowrap">{value}</dd>
				</div>
			))}
		</dl>
	);
}

/**
 * The record of the followed dot, beside its cell on the canvas: who it is, how it lives and where
 * its HP went. It stays open after the dot dies and shows how. The X button or Escape closes it.
 */
export function DotRecord({ followed, step, onClose, onCopyGenome }: DotRecordProps) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), copiedMs);
		return () => window.clearTimeout(timer);
	}, [copied]);

	if (!followed) return null;

	const { agent, death } = followed;
	const moves = agent.stays + agent.steps + agent.jumps;
	const cause = death?.cause;
	const status = !death
		? `Alive, age ${formatCount(agent.lifetime)} steps`
		: `Died at step ${formatCount(death.diedStep)} (${formatCount(step - death.diedStep)} ago) · ${
				cause?.kind === "caught"
					? `caught by ${speciesDisplay[cause.by].name} ${ids(cause.killers)}`
					: "ran out of HP"
			}`;

	return (
		<Popover
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<PopoverAnchor asChild>
				{/*
				 * The anchor eases toward the dot's cell, so the popover trails the dot smoothly instead
				 * of jumping a cell every step. Keyed by id: a newly followed dot starts in place.
				 */}
				<div
					key={agent.id}
					aria-hidden
					className="pointer-events-none absolute transition-[left,top] duration-500 ease-out motion-reduce:transition-none"
					style={{
						left: percent(agent.x, gridWidth),
						top: percent(agent.y, gridHeight),
						width: percent(1, gridWidth),
						height: percent(1, gridHeight),
					}}
				/>
			</PopoverAnchor>
			<PopoverContent
				side="left"
				align="start"
				sideOffset={8}
				collisionPadding={16}
				// Follow the easing anchor every frame, not only when the layout changes.
				updatePositionStrategy="always"
				aria-label="Dot record"
				className="w-72 gap-3 text-xs"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
			>
				<div className="flex items-start justify-between gap-3">
					<PopoverHeader>
						<PopoverTitle className="flex items-center gap-2 tabular-nums">
							<SpeciesSwatch species={followed.species} />
							{speciesDisplay[followed.species].name} #{agent.id}
						</PopoverTitle>
						<PopoverDescription className="text-xs tabular-nums">{status}</PopoverDescription>
					</PopoverHeader>
					<Button
						variant="ghost"
						size="icon-xs"
						className="-mt-1.5 -mr-1.5 text-muted-foreground"
						aria-label="Stop following"
						onClick={onClose}
					>
						<XIcon />
					</Button>
				</div>
				<Rows
					rows={[
						["Born", `step ${formatCount(agent.bornStep)}`],
						[
							"Parents",
							agent.parents ? `#${agent.parents[0]} × #${agent.parents[1]}` : "first generation",
						],
						["Children", formatCount(agent.children)],
						["HP", death ? "–" : formatCount(Math.round(agent.hp))],
						["Kills", formatCount(agent.kills)],
						[
							"Kills per 1,000 steps",
							agent.lifetime > 0 ? ((agent.kills / agent.lifetime) * 1000).toFixed(1) : "–",
						],
						[
							"Stay / step / jump",
							moves > 0
								? `${share(agent.stays, moves)} / ${share(agent.steps, moves)} / ${share(agent.jumps, moves)}`
								: "–",
						],
						["Wall bumps", formatCount(agent.wallBumps)],
					]}
				/>
				<div className="flex flex-col gap-1">
					<span className="font-medium">HP ledger</span>
					<Rows
						rows={[
							["Eaten", formatCount(Math.round(agent.hpEaten))],
							["Lost to crowding", formatCount(Math.round(agent.hpLostCrowding))],
							["Lost to disease", formatCount(Math.round(agent.hpLostDisease))],
							["Lost to walls", formatCount(Math.round(agent.hpLostWall))],
						]}
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						onCopyGenome();
						setCopied(true);
					}}
				>
					{copied ? "Copied" : "Copy genome"}
				</Button>
			</PopoverContent>
		</Popover>
	);
}
