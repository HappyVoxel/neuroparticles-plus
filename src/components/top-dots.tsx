import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { DotView, SpeciesStats } from "@/hooks/use-simulation";
import { formatCount } from "@/lib/format";
import { hallOfFameSize, topDotsShown } from "@/sim/config";
import type { Ranking } from "@/sim/types";

export const topDotsInfo = `The best hunters and the longest lives among the living dots and the ${hallOfFameSize} best dead of each species; † marks a dead one. Click a row to follow that dot on the canvas. Or press Z over the canvas to zoom in and click a dot to follow it.`;

const columns: readonly { ranking: Ranking; label: string }[] = [
	{ ranking: "kills", label: "Kills" },
	{ ranking: "lifetime", label: "Steps lived" },
];

interface TopDotsProps {
	top: Record<Ranking, DotView[]>;
	/** Name and color of each species, by the index a `DotView` carries. */
	species: readonly SpeciesStats[];
	followedId: number | null;
	onFollow: (id: number) => void;
}

/**
 * The best dots of all species by kills and by lifetime, side by side; a click follows one. A dot
 * at 0 isn't listed, so before the first catch or step the slots show "–".
 */
export function TopDots({ top, species, followedId, onFollow }: TopDotsProps) {
	return (
		<div className="grid grid-cols-2 gap-3">
			{columns.map(({ ranking, label }) => {
				const dots = top[ranking].filter(({ agent }) => agent[ranking] > 0);
				const empty = Array.from({ length: topDotsShown - dots.length }, (_, k) => k);
				return (
					<div key={ranking} className="flex flex-col gap-1">
						<h3 className="px-2 text-xs text-muted-foreground">{label}</h3>
						<ol className="flex flex-col">
							{dots.map(({ species: index, agent, death }) => {
								const s = species[index];
								const followed = agent.id === followedId;
								return (
									<li key={agent.id}>
										<Button
											variant="ghost"
											size="sm"
											aria-pressed={followed}
											data-sound="pop"
											onClick={() => onFollow(agent.id)}
											// Rows read as data, not as the uppercase labels buttons carry elsewhere.
											className={cn(
												"h-7 w-full justify-start gap-2 px-2 text-sm font-normal tracking-normal normal-case tabular-nums",
												followed && "bg-muted",
											)}
										>
											<span
												aria-hidden
												className="size-2 shrink-0"
												style={{ backgroundColor: s?.color }}
											/>
											<span className="sr-only">{s?.name}</span>#{agent.id}
											{death && (
												<span className="text-muted-foreground" title="Dead">
													†
												</span>
											)}
											<span className="ml-auto">{formatCount(agent[ranking])}</span>
										</Button>
									</li>
								);
							})}
							{empty.map((k) => (
								<li
									key={`empty-${k}`}
									className="flex h-7 items-center px-2 text-sm text-muted-foreground"
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
