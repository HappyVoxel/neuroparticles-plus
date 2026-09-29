import { FoodCycle } from "@/components/food-cycle";
import { MutationControls } from "@/components/mutation-controls";
import { RunControls } from "@/components/run-controls";
import { SimCanvas } from "@/components/sim-canvas";
import { SpeciesStats } from "@/components/species-stats";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type RunStatus, useSimulation } from "@/hooks/use-simulation";
import { formatCount } from "@/lib/format";
import { gridHeight, gridWidth } from "@/sim/config";

const statusLabel: Record<RunStatus, string> = {
	paused: "Paused",
	running: "Running",
	stopped: "Stopped",
};

export function App() {
	const sim = useSimulation({ percent: 5, genes: 1 });
	const { snap, status } = sim;

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:w-fit">
			<header className="flex items-start justify-between gap-6">
				<div className="flex max-w-prose flex-col gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">Neuroparticles</h1>
					<p className="text-sm text-muted-foreground">
						Each dot is a small neural net that sees the 11×11 cells around it and picks a move. Red
						eats green, green eats blue, blue eats red. The longest-lived survivors breed.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-4">
					<Badge variant={status === "running" ? "default" : "secondary"} aria-live="polite">
						{statusLabel[status]}
					</Badge>
					<ThemeToggle />
				</div>
			</header>

			<main className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
				{/* On wide screens the canvas takes whatever height is left under the header, so nothing scrolls. */}
				<section
					aria-label="Field"
					className="flex w-full max-w-2xl flex-col gap-3 lg:w-[clamp(20rem,min(calc(100svh-11.5rem),calc(100vw-26rem)),42rem)] lg:shrink-0"
				>
					<SimCanvas canvasRef={sim.canvasRef} />
					<div className="flex justify-between gap-4 text-sm text-muted-foreground tabular-nums">
						<span>Step {formatCount(snap.step)}</span>
						<span>
							{gridWidth} × {gridHeight} grid, edges wrap around
						</span>
					</div>
					{snap.extinct.length > 0 && (
						<Alert variant="destructive">
							<AlertTitle>
								{snap.extinct.join(" and ")} died out at step {formatCount(snap.step)}.
							</AlertTitle>
							<AlertDescription>Reload the page to start a new run.</AlertDescription>
						</Alert>
					)}
				</section>

				<aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
					<RunControls
						status={status}
						onRun={sim.run}
						onPause={sim.pause}
						onStep={sim.stepOnce}
						onRandomize={sim.randomizeBrains}
					/>

					<Separator />

					<section aria-labelledby="species-heading" className="flex flex-col gap-3">
						<h2 id="species-heading" className="text-sm font-medium">
							Food cycle
						</h2>
						<FoodCycle species={snap.species} />
						<SpeciesStats species={snap.species} />
					</section>

					<Separator />

					<section aria-labelledby="mutation-heading" className="flex flex-col gap-3">
						<h2 id="mutation-heading" className="text-sm font-medium">
							Mutation
						</h2>
						<MutationControls mutation={sim.mutation} onChange={sim.setMutation} />
					</section>
				</aside>
			</main>
		</div>
	);
}
