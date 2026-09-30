import type { SpeciesStats } from "@/hooks/use-simulation";
import { speciesDisplay } from "@/lib/species";
import { preyOf } from "@/sim/capture";
import { populationSize } from "@/sim/config";

interface FoodCycleProps {
	species: readonly SpeciesStats[];
}

// The triangle's labels reach from y≈0 to y≈184, so the box is cropped just below that.
const width = 220;
const height = 188;
const center = width / 2;
const orbit = 72;
const minRadius = 5;
const maxRadius = 20;

/** Node area tracks population, so a species at half strength looks half as big. */
function nodeRadius(population: number): number {
	return minRadius + (maxRadius - minRadius) * Math.sqrt(population / populationSize);
}

function position(index: number, count: number): { x: number; y: number } {
	const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
	return { x: center + orbit * Math.cos(angle), y: center + orbit * Math.sin(angle) };
}

/**
 * Who eats whom, drawn live: each species is a dot sized by population, and each arrow points
 * from a predator to its prey. A species that died out becomes a hollow ring.
 */
export function FoodCycle({ species }: FoodCycleProps) {
	const n = species.length;
	const summary = speciesDisplay
		.map((s, i) => `${s.name} eats ${speciesDisplay[preyOf(i, n)].name.toLowerCase()}`)
		.join(", ");

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label={`Food cycle: ${summary}.`}
			className="mx-auto w-full max-w-40 text-muted-foreground"
		>
			<defs>
				<marker
					id="food-cycle-arrow"
					viewBox="0 0 10 10"
					refX="9"
					refY="5"
					markerWidth="7"
					markerHeight="7"
					orient="auto-start-reverse"
				>
					<path d="M0 0 10 5 0 10z" fill="currentColor" />
				</marker>
			</defs>

			{speciesDisplay.map(({ name }, i) => {
				const from = position(i, n);
				const to = position(preyOf(i, n), n);
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const length = Math.hypot(dx, dy);
				const gap = maxRadius + 6;
				return (
					<line
						key={`${name}-arrow`}
						x1={from.x + (dx / length) * gap}
						y1={from.y + (dy / length) * gap}
						x2={to.x - (dx / length) * gap}
						y2={to.y - (dy / length) * gap}
						stroke="currentColor"
						strokeWidth="1.25"
						markerEnd="url(#food-cycle-arrow)"
					/>
				);
			})}

			{species.map((s, i) => {
				const { name, color } = speciesDisplay[i];
				const { x, y } = position(i, n);
				const extinct = s.population === 0;
				const labelBelow = y > center;
				return (
					<g key={name}>
						<circle
							cx={x}
							cy={y}
							r={nodeRadius(s.population)}
							fill={extinct ? "none" : color}
							stroke={extinct ? "currentColor" : "none"}
							strokeWidth="1.25"
							className="transition-[r] duration-150 motion-reduce:transition-none"
						/>
						<text
							x={x}
							y={labelBelow ? y + maxRadius + 14 : y - maxRadius - 8}
							textAnchor="middle"
							className="fill-foreground text-xs"
						>
							{name}
						</text>
					</g>
				);
			})}
		</svg>
	);
}
