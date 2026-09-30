import type { CSSProperties } from "react";
import { SpeciesSwatch } from "@/components/species-swatch";
import { Progress } from "@/components/ui/progress";
import type { SpeciesStats as Stats } from "@/hooks/use-simulation";
import { formatCount } from "@/lib/format";
import { speciesDisplay } from "@/lib/species";
import { populationSize } from "@/sim/config";

interface SpeciesStatsProps {
	species: readonly Stats[];
}

export function SpeciesStats({ species }: SpeciesStatsProps) {
	return (
		<ul className="flex flex-col gap-3">
			{species.map((s, i) => {
				const { name, color } = speciesDisplay[i];
				return (
					<li key={name} className="flex flex-col gap-1.5">
						<div className="flex items-baseline gap-3 text-sm tabular-nums">
							<span className="flex w-14 items-center gap-2 font-medium">
								<SpeciesSwatch species={i} />
								{name}
							</span>
							<span>
								{formatCount(s.population)}
								<span className="text-muted-foreground"> alive</span>
							</span>
							<span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
								{s.population === 0
									? "died out"
									: `oldest ${formatCount(s.oldest)} · best ${formatCount(s.topKills)} kills`}
							</span>
						</div>
						<Progress
							value={(s.population / populationSize) * 100}
							aria-label={`${name} population`}
							// The indicator paints with --primary; point it at this species' color.
							style={{ "--primary": color } as CSSProperties}
							className="h-1"
						/>
					</li>
				);
			})}
		</ul>
	);
}
