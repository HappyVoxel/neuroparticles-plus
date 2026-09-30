import { AreaInspector } from "@/components/area-inspector";
import { FoodCycle } from "@/components/food-cycle";
import { InfoPopover } from "@/components/info-popover";
import { MutationControls } from "@/components/mutation-controls";
import { RunControls } from "@/components/run-controls";
import { SimCanvas } from "@/components/sim-canvas";
import { SpeciesStats } from "@/components/species-stats";
import { ThemeToggle } from "@/components/theme-toggle";
import { WallControls } from "@/components/wall-controls";
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
		<div className="mx-auto flex min-h-svh w-full flex-col gap-2 p-4 lg:w-fit lg:justify-center">
			<header className="flex items-start justify-between gap-6">
				<div className="flex max-w-prose flex-col gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">Neuroparticles</h1>
					<p className="text-sm text-muted-foreground">
						Each dot is a small neural net that sees a circle of 121 cells around it and picks a
						move. Red eats green, green eats blue, blue eats red. The best hunters breed first.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-4">
					<Badge variant={status === "running" ? "default" : "secondary"} aria-live="polite">
						{statusLabel[status]}
					</Badge>
					<ThemeToggle />
				</div>
			</header>

			<main className="flex flex-col gap-6 lg:flex-row lg:gap-12">
				{/*
				 * On wide screens the canvas fills the height left over by the rest of the page:
				 * 9.5rem = p-4 top + bottom (2rem), header (5rem), gap-2 (0.5rem), caption + gap-3 (2rem).
				 * 25rem = aside (20rem) + gap-12 (3rem) + p-4 left + right (2rem). Update both if those change.
				 */}
				<section
					aria-label="Field"
					className="flex w-full flex-col gap-3 lg:w-[max(20rem,min(calc(100svh-9.5rem),calc(100vw-25rem)))] lg:shrink-0"
				>
					<div className="relative">
						<SimCanvas canvasRef={sim.canvasRef} />
						<AreaInspector area={sim.area} species={snap.areaSpecies} onInspect={sim.inspect} />
						{snap.extinct.length > 0 && (
							<Alert variant="destructive" className="absolute inset-x-3 bottom-3 w-auto">
								<AlertTitle>
									{snap.extinct.join(" and ")} died out at step {formatCount(snap.step)}.
								</AlertTitle>
								<AlertDescription>Press Reset to start a new run.</AlertDescription>
							</Alert>
						)}
					</div>
					<div className="flex justify-between gap-4 text-sm text-muted-foreground tabular-nums">
						<span>Step {formatCount(snap.step)}</span>
						<span>
							{gridWidth} × {gridHeight} grid, walled edges
						</span>
					</div>
				</section>

				<aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
					<RunControls
						status={status}
						stepsPerSecond={sim.stepsPerSecond}
						onSpeedChange={sim.setSpeed}
						onRun={sim.run}
						onPause={sim.pause}
						onStep={sim.stepOnce}
						onRandomize={sim.randomizeBrains}
						onReset={sim.reset}
					/>

					<Separator />

					<section aria-labelledby="population-heading" className="flex flex-col gap-3">
						<div className="flex items-center justify-between gap-3">
							<h2 id="population-heading" className="text-sm font-medium">
								Population
							</h2>
							<InfoPopover topic="population">
								<div className="flex flex-col gap-2">
									<FoodCycle species={snap.species} />
									<p>Arrows point from hunter to prey. Dot size tracks population.</p>
								</div>
							</InfoPopover>
						</div>
						<SpeciesStats species={snap.species} />
					</section>

					{/* Pinned to the bottom so the sidebar lines up with the canvas caption. */}
					<Separator className="lg:mt-auto" />

					<section aria-labelledby="walls-heading" className="flex flex-col gap-3">
						<div className="flex items-center justify-between gap-3">
							<h2 id="walls-heading" className="text-sm font-medium">
								Walls
							</h2>
							<InfoPopover topic="walls">
								HP a dot loses each time it moves into a wall. Behavior shifts as new dots are born.
							</InfoPopover>
						</div>
						<WallControls wallPenalty={sim.wallPenalty} onChange={sim.setWallPenalty} />
					</section>

					<Separator />

					<section aria-labelledby="mutation-heading" className="flex flex-col gap-3">
						<div className="flex items-center justify-between gap-3">
							<h2 id="mutation-heading" className="text-sm font-medium">
								Mutation
							</h2>
							<InfoPopover topic="mutation">
								How often a newborn gets random weights, and how many.
							</InfoPopover>
						</div>
						<MutationControls mutation={sim.mutation} onChange={sim.setMutation} />
					</section>
				</aside>
			</main>
		</div>
	);
}
