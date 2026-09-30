import { useCallback } from "react";
import { AreaInspector } from "@/components/area-inspector";
import { CanvasLoupe } from "@/components/canvas-loupe";
import { DotRecord } from "@/components/dot-record";
import { FoodCycle } from "@/components/food-cycle";
import { MutationControls } from "@/components/mutation-controls";
import { RunControls } from "@/components/run-controls";
import { SidebarSection } from "@/components/sidebar-section";
import { SimCanvas } from "@/components/sim-canvas";
import { SoundMenu } from "@/components/sound-menu";
import { SpeciesStats } from "@/components/species-stats";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopDots, topDotsInfo } from "@/components/top-dots";
import { WallControls } from "@/components/wall-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLoupe } from "@/hooks/use-loupe";
import { useRunShortcut } from "@/hooks/use-run-shortcut";
import { type RunStatus, useSimulation } from "@/hooks/use-simulation";
import { useSound } from "@/hooks/use-sound";
import { formatCount } from "@/lib/format";
import { defaultMutation, gridHeight, gridWidth } from "@/sim/config";

const statusLabel: Record<RunStatus, string> = {
	paused: "Paused",
	running: "Running",
	stopped: "Stopped",
};

export function App() {
	const sim = useSimulation(defaultMutation);
	const { snap, status } = sim;
	const loupeOn = useLoupe();
	const sound = useSound();
	const { play } = sound;
	const playClick = useCallback(() => play("click"), [play]);
	useRunShortcut(status === "running" ? sim.pause : sim.run);
	const extinct = snap.species.filter((s) => s.population === 0).map((s) => s.name);

	const copyGenome = () => {
		const genome = sim.followedGenome();
		// Clipboard access can be refused (no focus, no permission); the button then does nothing.
		if (genome) navigator.clipboard.writeText(JSON.stringify(genome)).catch(() => {});
	};

	return (
		<div className="mx-auto flex min-h-svh w-full flex-col gap-2 p-4 lg:w-fit lg:justify-center">
			<header className="flex items-start justify-between gap-6">
				<div className="flex max-w-prose flex-col gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">Neuroparticles+</h1>
				</div>
				<div className="flex shrink-0 items-center gap-4">
					<Badge variant={status === "running" ? "default" : "secondary"} aria-live="polite">
						{statusLabel[status]}
					</Badge>
					<SoundMenu
						music={sound.music}
						effects={sound.effects}
						onMusicChange={sound.setMusic}
						onEffectsChange={sound.setEffects}
						onOpen={playClick}
					/>
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
						<AreaInspector
							area={snap.area}
							species={snap.areaSpecies}
							onInspect={sim.inspect}
							onPick={(x, y) => {
								if (sim.pick(x, y, loupeOn)) sound.play("pop");
							}}
							precise={loupeOn}
						/>
						<DotRecord
							followed={snap.followed}
							species={snap.species}
							step={snap.step}
							onClose={() => sim.follow(null)}
							onCopyGenome={copyGenome}
						/>
						<CanvasLoupe canvasRef={sim.canvasRef} on={loupeOn} />
						{extinct.length > 0 && (
							<Alert variant="destructive" className="absolute inset-x-3 bottom-3 w-auto">
								<AlertTitle>
									{extinct.join(" and ")} died out at step {formatCount(snap.step)}.
								</AlertTitle>
								<AlertDescription>Press Reset to start a new run.</AlertDescription>
							</Alert>
						)}
					</div>
					<div className="flex justify-between gap-4 text-sm text-muted-foreground tabular-nums">
						<span>Step {formatCount(snap.step)}</span>
						<span>
							Space runs · drag an area · click a dot · Z zooms · {gridWidth} × {gridHeight} grid
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

					<SidebarSection
						title="Population"
						info={
							<div className="flex flex-col gap-2">
								<FoodCycle species={snap.species} />
								<p>Arrows point from hunter to prey. Dot size tracks population.</p>
							</div>
						}
					>
						<SpeciesStats species={snap.species} />
					</SidebarSection>

					<Separator />

					<SidebarSection title="Top dots" info={topDotsInfo}>
						<TopDots
							top={snap.top}
							species={snap.species}
							followedId={snap.followed?.agent.id ?? null}
							onFollow={sim.follow}
						/>
					</SidebarSection>

					{/* Pinned to the bottom so the sidebar lines up with the canvas caption. */}
					<Separator className="lg:mt-auto" />

					<SidebarSection
						title="Walls"
						info="HP a dot loses each time it moves into a wall. Behavior shifts as new dots are born."
					>
						<WallControls wallPenalty={sim.wallPenalty} onChange={sim.setWallPenalty} />
					</SidebarSection>

					<Separator />

					<SidebarSection
						title="Mutation"
						info="How often a newborn gets random weights, and how many."
					>
						<MutationControls mutation={sim.mutation} onChange={sim.setMutation} />
					</SidebarSection>
				</aside>
			</main>
		</div>
	);
}
