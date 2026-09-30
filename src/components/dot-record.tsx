import { SwordsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CanvasPopover, cellBox } from "@/components/canvas-popover";
import { SpeciesSwatch } from "@/components/species-swatch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import type { DotView } from "@/hooks/use-simulation";
import { formatCount } from "@/lib/format";
import { speciesDisplay } from "@/lib/species";
import { isDead } from "@/sim/records";

interface DotRecordProps {
	followed: DotView | null;
	/** Whether the followed dot is its species' top hunter, which wears swords on the canvas. */
	topHunter: boolean;
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
export function DotRecord({ followed, topHunter, step, onClose, onCopyGenome }: DotRecordProps) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), copiedMs);
		return () => window.clearTimeout(timer);
	}, [copied]);

	if (!followed) return null;

	const { agent } = followed;
	const moves = agent.stays + agent.steps + agent.jumps;
	const dead = isDead(agent);
	const cause = dead ? agent.cause : null;
	const status = !dead
		? `Alive, age ${formatCount(agent.lifetime)} steps`
		: `Died at step ${formatCount(agent.diedStep)} (${formatCount(step - agent.diedStep)} ago) · ${
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
					style={cellBox(agent.x, agent.y, 1, 1)}
				/>
			</PopoverAnchor>
			<CanvasPopover
				side="left"
				collisionPadding={16}
				// Follow the easing anchor every frame, not only when the layout changes.
				updatePositionStrategy="always"
				aria-label="Dot record"
				title={
					<>
						<SpeciesSwatch species={followed.species} />
						{speciesDisplay[followed.species].name} #{agent.id}
						{topHunter && (
							<SwordsIcon
								role="img"
								aria-label="Top hunter"
								className="size-4"
								style={{ color: speciesDisplay[followed.species].color }}
							/>
						)}
					</>
				}
				titleClassName="flex items-center gap-2 tabular-nums"
				description={status}
				closeLabel="Stop following"
				onClose={onClose}
			>
				<Rows
					rows={[
						["Born", `step ${formatCount(agent.bornStep)}`],
						[
							"Parents",
							agent.parents ? `#${agent.parents[0]} × #${agent.parents[1]}` : "first generation",
						],
						["Children", formatCount(agent.children)],
						["HP", dead ? "–" : formatCount(Math.round(agent.hp))],
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
			</CanvasPopover>
		</Popover>
	);
}
