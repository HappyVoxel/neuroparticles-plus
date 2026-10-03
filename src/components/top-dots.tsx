import { cn } from "cn";
import { SpeciesSwatch } from "@/components/species-swatch";
import { Button } from "@/components/ui/button";
import type { DotRef } from "@/sim/records";
import { formatCompact, formatCount } from "@/lib/format";
import { speciesDisplay } from "@/lib/species";
import { hallOfFameSize, topDotsShown } from "@/sim/config";
import { isDead } from "@/sim/records";
import type { Ranking } from "@/sim/types";

export const topDotsInfo = `The best hunters, the longest lives and the highest HP ever reached, among the living dots and the ${hallOfFameSize} best dead of each species; † marks a dead one. Hover a number for its full value. The filter icon hides the dead or a species. Click a row to follow that dot on the canvas. Or press Z over the canvas to zoom in and click a dot to follow it.`;

const columns: readonly { ranking: Ranking; label: string }[] = [
	{ ranking: "kills", label: "Kills" },
	{ ranking: "lifetime", label: "Steps lived" },
	{ ranking: "peakHp", label: "Peak HP" },
];

interface TopDotsProps {
	top: Record<Ranking, DotRef[]>;
	followedId: number | null;
	onFollow: (id: number) => void;
}

/**
 * The best dots of all species by kills, lifetime and peak HP, side by side, in short numbers with
 * the full one on hover; a click follows one. A dot at 0 isn't listed, so before the first catch or
 * step the slots show "–".
 */
export function TopDots({ top, followedId, onFollow }: TopDotsProps) {
	return (
		// Kills stay short, so their column is narrower and the other two get room for 5-digit ids.
		<div className="grid grid-cols-[0.85fr_1fr_1fr] gap-1.5">
			{columns.map(({ ranking, label }) => {
				const dots = top[ranking];
				const empty = Array.from({ length: topDotsShown - dots.length }, (_, k) => k);
				return (
					<div key={ranking} className="flex min-w-0 flex-col gap-1">
						<h3 className="text-xs text-muted-foreground">{label}</h3>
						<ol className="flex flex-col">
							{dots.map(({ species, agent }) => {
								const followed = agent.id === followedId;
								return (
									<li key={agent.id}>
										<Button
											variant="ghost"
											size="xs"
											aria-pressed={followed}
											data-sound="pop"
											onClick={() => onFollow(agent.id)}
											// Rows read as data, not as the uppercase labels buttons carry elsewhere.
											className={cn(
												"h-7 w-full min-w-0 justify-start gap-1 px-1 text-xs font-normal tracking-normal normal-case tabular-nums",
												followed && "bg-muted",
											)}
										>
											<SpeciesSwatch species={species} />
											<span className="sr-only">{speciesDisplay[species].name} #</span>
											{/* A long id ends in "…" before it pushes the number out; hover shows it. */}
											<span className="min-w-0 truncate" title={`#${agent.id}`}>
												{agent.id}
											</span>
											{isDead(agent) && (
												<span className="shrink-0 text-muted-foreground" title="Dead">
													†
												</span>
											)}
											<span
												className="ml-auto shrink-0"
												title={formatCount(Math.round(agent[ranking]))}
											>
												{formatCompact(agent[ranking])}
											</span>
										</Button>
									</li>
								);
							})}
							{empty.map((k) => (
								<li
									key={`empty-${k}`}
									className="flex h-7 items-center px-1 text-sm text-muted-foreground"
								>
									–
								</li>
							))}
						</ol>
					</div>
				);
			})}
		</div>
	);
}
