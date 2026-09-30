import { cn } from "cn";
import { SpeciesSwatch } from "@/components/species-swatch";
import { Button } from "@/components/ui/button";
import type { DotView } from "@/hooks/use-simulation";
import { formatCount } from "@/lib/format";
import { speciesDisplay } from "@/lib/species";
import { hallOfFameSize, topDotsShown } from "@/sim/config";
import type { Ranking } from "@/sim/types";

export const topDotsInfo = `The best hunters and the longest lives among the living dots and the ${hallOfFameSize} best dead of each species; † marks a dead one. The filter icon hides the dead or a species. Click a row to follow that dot on the canvas. Or press Z over the canvas to zoom in and click a dot to follow it.`;

const columns: readonly { ranking: Ranking; label: string }[] = [
	{ ranking: "kills", label: "Kills" },
	{ ranking: "lifetime", label: "Steps lived" },
];

interface TopDotsProps {
	top: Record<Ranking, DotView[]>;
	followedId: number | null;
	onFollow: (id: number) => void;
}

/**
 * The best dots of all species by kills and by lifetime, side by side; a click follows one. A dot
 * at 0 isn't listed, so before the first catch or step the slots show "–".
 */
export function TopDots({ top, followedId, onFollow }: TopDotsProps) {
	return (
		<div className="grid grid-cols-2 gap-3">
			{columns.map(({ ranking, label }) => {
				const dots = top[ranking].filter(({ agent }) => agent[ranking] > 0);
				const empty = Array.from({ length: topDotsShown - dots.length }, (_, k) => k);
				return (
					<div key={ranking} className="flex flex-col gap-1">
						<h3 className="text-xs text-muted-foreground">{label}</h3>
						<ol className="flex flex-col">
							{dots.map(({ species, agent, death }) => {
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
												"h-7 w-full justify-start gap-2 px-2 text-xs font-normal tracking-normal normal-case tabular-nums",
												followed && "bg-muted",
											)}
										>
											<SpeciesSwatch species={species} />
											<span className="sr-only">{speciesDisplay[species].name}</span>#{agent.id}
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
