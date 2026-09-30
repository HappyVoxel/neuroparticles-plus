import { useCallback, useEffect, useRef, useState } from "react";
import { type Area, agentsIn } from "@/sim/area";
import { loadSimSettings, saveSimSettings } from "@/hooks/sim-settings";
import { readSetting, writeSetting } from "@/lib/storage";
import {
	cellPixels,
	gridWidth,
	loupePickCells,
	maxSlidingStepsPerSecond,
	pickCells,
	speciesDefs,
	stepsAhead,
	topDotsShown,
} from "@/sim/config";
import type { SimReply, SimRequest } from "@/sim/host";
import {
	type DotRef,
	emptyHallOfFame,
	findDot,
	isDead,
	leaderIds,
	nearestDot,
	topDots,
} from "@/sim/records";
import { draw } from "@/sim/render";
import { extinctSpecies } from "@/sim/simulation";
import type {
	AgentView,
	DiseaseArea,
	Genome,
	MutationParams,
	Ranking,
	SimView,
	TopDotsFilter,
} from "@/sim/types";

export type RunStatus = "paused" | "running" | "stopped";

/** Live stats of one species; its name and color are in `speciesDisplay`, by the same index. */
export interface SpeciesStats {
	population: number;
	/** Longest lifetime among living agents, in steps. */
	oldest: number;
	/** Mean lifetime in steps; 0 with no agents. */
	averageAge: number;
	/** Mean HP; 0 with no agents. */
	averageHp: number;
	/** Most kills among living agents. */
	topKills: number;
}

export interface SimSnapshot {
	step: number;
	species: SpeciesStats[];
	/** Indexes of the species that died out (`extinctSpecies`); the run is over once non-empty. */
	extinct: number[];
	/** The same stats for the agents inside the inspected area, or null with no area. */
	areaSpecies: SpeciesStats[] | null;
	/** The inspected area, or null. */
	area: Area | null;
	/** The dot being followed, last seen alive or at its death; null when none. */
	followed: DotRef | null;
	/** The best `topDotsShown` dots the top-dots filter lets through, per ranking. */
	top: Record<Ranking, DotRef[]>;
	/** The disease areas on the field, for their labels. */
	diseaseAreas: readonly DiseaseArea[];
	/** Per species, the id of its living dot with the most kills (the swords); null with no kills. */
	topHunterIds: (number | null)[];
}

function speciesStats(agents: readonly AgentView[]): SpeciesStats {
	let oldest = 0;
	let topKills = 0;
	let ageSum = 0;
	let hpSum = 0;
	for (let i = 0; i < agents.length; i++) {
		oldest = Math.max(oldest, agents[i].lifetime);
		topKills = Math.max(topKills, agents[i].kills);
		ageSum += agents[i].lifetime;
		hpSum += agents[i].hp;
	}
	const n = agents.length;
	return {
		population: n,
		oldest,
		averageAge: n > 0 ? ageSum / n : 0,
		averageHp: n > 0 ? hpSum / n : 0,
		topKills,
	};
}

function snapshot(
	sim: SimView,
	area: Area | null,
	followed: DotRef | null,
	filter: TopDotsFilter,
): SimSnapshot {
	return {
		step: sim.step,
		species: sim.species.map((s) => speciesStats(s.agents)),
		extinct: extinctSpecies(sim),
		areaSpecies: area && sim.species.map((s) => speciesStats(agentsIn(s.agents, area))),
		area,
		followed,
		top: {
			kills: topDots(sim, "kills", topDotsShown, filter),
			lifetime: topDots(sim, "lifetime", topDotsShown, filter),
		},
		diseaseAreas: sim.disease.areas,
		topHunterIds: leaderIds(sim, "kills"),
	};
}

/** The field before the worker's first frame: no dots yet. */
function emptyView(): SimView {
	return {
		step: 0,
		disease: { areas: [] },
		species: speciesDefs.map(({ id, name, shades }) => ({
			id,
			name,
			shades,
			agents: [],
			hallOfFame: emptyHallOfFame(),
			lastDeaths: [],
		})),
	};
}

const isOver = (sim: SimView): boolean => extinctSpecies(sim).length > 0;

/**
 * Runs the simulation in a worker (`sim/worker.ts`) and draws it on one animation-frame loop.
 * While running, the worker keeps up to `stepsAhead` steps ready; each frame takes the steps that
 * are due at the chosen speed, draws the canvas once and hands React a fresh snapshot. A frame
 * never waits for a step: when none is ready, the dots hold on their cells. Speed, walls,
 * mutation and the top-dots filter start from the values saved in `localStorage` and are saved on
 * every change.
 */
export function useSimulation() {
	const [saved] = useState(() => loadSimSettings(readSetting));
	const workerRef = useRef<Worker | null>(null);
	/** The step on the canvas. */
	const viewRef = useRef<SimView>(emptyView());
	/** Steps from the worker waiting for their turn on the canvas, oldest first. */
	const queueRef = useRef<SimView[]>([]);
	/** Steps asked of the worker and not back yet. */
	const inFlightRef = useRef(0);
	/** Goes up each time the steps asked for are thrown away; frames of an older epoch are dropped. */
	const epochRef = useRef(0);
	const settingsRef = useRef({ mutation: saved.mutation, wallPenalty: saved.wallPenalty });
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameRef = useRef<number | undefined>(undefined);
	const lastFrameRef = useRef(0);
	/** Steps owed to the clock; the part below 1 is how far the frame is into the next step. */
	const dueRef = useRef(0);
	const speedRef = useRef(saved.stepsPerSecond);
	const areaRef = useRef<Area | null>(null);
	/** The followed dot as last seen: alive, or at its death once it is gone. */
	const followRef = useRef<DotRef | null>(null);
	/** The followed dot's genome, once the worker sends it. */
	const followedGenomeRef = useRef<Genome | null>(null);
	const topFilterRef = useRef(saved.topDots);
	/** How far through the last move the canvas was last painted, to repaint it the same. */
	const paintedTRef = useRef(1);

	// Before the worker's first frame there are no dots, which is not a run that ended.
	const [snap, setSnap] = useState((): SimSnapshot => ({
		...snapshot(viewRef.current, null, null, saved.topDots),
		extinct: [],
	}));
	const [running, setRunning] = useState(false);
	const [mutation, setMutationState] = useState(saved.mutation);
	const [wallPenalty, setWallPenaltyState] = useState(saved.wallPenalty);
	const [stepsPerSecond, setStepsPerSecond] = useState(saved.stepsPerSecond);
	const [topFilter, setTopFilterState] = useState(saved.topDots);

	useEffect(() => {
		saveSimSettings({ mutation, wallPenalty, stepsPerSecond, topDots: topFilter }, writeSetting);
	}, [mutation, wallPenalty, stepsPerSecond, topFilter]);

	const status: RunStatus = snap.extinct.length > 0 ? "stopped" : running ? "running" : "paused";

	const paint = useCallback((t: number) => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		const sim = viewRef.current;
		if (!canvas || !ctx) return;
		paintedTRef.current = t;
		// `draw` works in `cellPixels` per cell; this maps that onto the canvas' real pixels.
		const scale = canvas.width / (gridWidth * cellPixels);
		ctx.setTransform(scale, 0, 0, scale, 0, 0);
		const followId = followRef.current?.agent.id ?? null;
		const glowIds = leaderIds(sim, "lifetime");
		const swordsIds = leaderIds(sim, "kills");
		draw(ctx, sim.species, sim.disease.areas, t, followId, glowIds, swordsIds, performance.now());
	}, []);

	const send = useCallback((request: SimRequest) => {
		workerRef.current?.postMessage(request);
	}, []);

	/** Throws away the steps asked for and not shown yet; returns the new epoch. */
	const discard = useCallback((): number => {
		queueRef.current = [];
		inFlightRef.current = 0;
		return ++epochRef.current;
	}, []);

	const askSteps = useCallback(
		(count: number) => {
			for (let i = 0; i < count; i++) send({ type: "step", epoch: epochRef.current });
			inFlightRef.current += Math.max(0, count);
		},
		[send],
	);

	/** Puts the next step on the canvas and keeps the followed dot's record current, including its death. */
	const show = useCallback((next: SimView) => {
		viewRef.current = next;
		const followed = followRef.current;
		if (followed && !isDead(followed.agent)) {
			followRef.current = findDot(next, followed.agent.id) ?? followed;
		}
	}, []);

	const publish = useCallback(() => {
		setSnap(snapshot(viewRef.current, areaRef.current, followRef.current, topFilterRef.current));
	}, []);

	const cancelFrame = useCallback(() => {
		if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current);
		frameRef.current = undefined;
	}, []);

	const frame = useCallback(
		(now: number) => {
			const elapsed = Math.max(0, now - lastFrameRef.current);
			lastFrameRef.current = now;
			dueRef.current += (elapsed * speedRef.current) / 1000;

			const queue = queueRef.current;
			let stepped = false;
			let extinct = false;
			while (dueRef.current >= 1 && queue.length > 0 && !extinct) {
				show(queue.shift() as SimView);
				dueRef.current -= 1;
				stepped = true;
				extinct = isOver(viewRef.current);
			}
			// The worker is behind: hold the dots on their cells until its next step comes.
			dueRef.current = Math.min(dueRef.current, 1);

			if (stepped) publish();
			if (extinct) {
				frameRef.current = undefined;
				paint(1);
				setRunning(false);
				return;
			}
			askSteps(stepsAhead - inFlightRef.current - queue.length);
			paint(speedRef.current <= maxSlidingStepsPerSecond ? dueRef.current : 1);
			frameRef.current = window.requestAnimationFrame(frame);
		},
		[paint, show, publish, askSteps],
	);

	const receive = useCallback(
		(reply: SimReply) => {
			if (reply.type === "genome") {
				if (reply.id === followRef.current?.agent.id) followedGenomeRef.current = reply.genome;
				return;
			}
			if (reply.epoch !== epochRef.current) return;
			if (reply.kind === "replace") {
				viewRef.current = reply.view;
			} else {
				inFlightRef.current--;
				// Running, the frame loop takes it when due; paused, it is a Step and shows at once.
				if (frameRef.current !== undefined) {
					queueRef.current.push(reply.view);
					return;
				}
				show(reply.view);
				// A whole step is shown, so the next Run starts its slide from these cells.
				dueRef.current = 1;
			}
			paint(1);
			publish();
		},
		[paint, show, publish],
	);

	const run = useCallback(() => {
		if (frameRef.current !== undefined || isOver(viewRef.current)) return;
		lastFrameRef.current = performance.now();
		frameRef.current = window.requestAnimationFrame(frame);
		setRunning(true);
	}, [frame]);

	/** Stops the loop and sends the worker back to the step on the canvas. */
	const pause = useCallback(() => {
		cancelFrame();
		send({ type: "rewind", epoch: discard(), step: viewRef.current.step });
		setRunning(false);
	}, [cancelFrame, send, discard]);

	/** Asks for one step; it shows when it comes back. Ignored while one is on its way. */
	const stepOnce = useCallback(() => {
		if (isOver(viewRef.current) || inFlightRef.current > 0) return;
		askSteps(1);
	}, [askSteps]);

	const setSpeed = useCallback((next: number) => {
		speedRef.current = next;
		setStepsPerSecond(next);
	}, []);

	/** New brains make new dots with new ids, so the followed dot is let go. */
	const randomizeBrains = useCallback(() => {
		followRef.current = null;
		followedGenomeRef.current = null;
		send({ type: "recreate", epoch: discard(), step: viewRef.current.step });
	}, [send, discard]);

	/** Starts a new run at step 0 with fresh random dots; keeps the mutation and wall settings. */
	const reset = useCallback(() => {
		cancelFrame();
		send({ type: "reset", epoch: discard(), ...settingsRef.current });
		dueRef.current = 0;
		areaRef.current = null;
		followRef.current = null;
		followedGenomeRef.current = null;
		setRunning(false);
	}, [cancelFrame, send, discard]);

	/** Sets the area every snapshot carries, with its stats in `areaSpecies`; null clears it. */
	const inspect = useCallback(
		(next: Area | null) => {
			areaRef.current = next;
			publish();
		},
		[publish],
	);

	/** Sets which dots the top-dots board lists; the snapshot follows at once, paused or not. */
	const setTopFilter = useCallback(
		(next: TopDotsFilter) => {
			topFilterRef.current = next;
			setTopFilterState(next);
			publish();
		},
		[publish],
	);

	/** Follows the dot with this id (living or dead); null or an unknown id stops following. */
	const follow = useCallback(
		(id: number | null) => {
			const found = id === null ? null : findDot(viewRef.current, id);
			followRef.current = found;
			followedGenomeRef.current = null;
			if (found) send({ type: "follow", id: found.agent.id });
			paint(paintedTRef.current);
			publish();
		},
		[paint, publish, send],
	);

	/**
	 * Follows the living dot nearest to a cell: within `loupePickCells` when `precise` (the loupe
	 * is on), `pickCells` otherwise. With none that close it stops following. True when it found one.
	 */
	const pick = useCallback(
		(x: number, y: number, precise: boolean): boolean => {
			const found = nearestDot(viewRef.current, x, y, precise ? loupePickCells : pickCells);
			follow(found?.agent.id ?? null);
			return found !== null;
		},
		[follow],
	);

	/** The followed dot's genome, for copying; null when none is followed or it hasn't come yet. */
	const followedGenome = useCallback((): Genome | null => followedGenomeRef.current, []);

	const setMutation = useCallback(
		(next: MutationParams) => {
			settingsRef.current = { ...settingsRef.current, mutation: next };
			send({ type: "settings", ...settingsRef.current });
			setMutationState(next);
		},
		[send],
	);

	const setWallPenalty = useCallback(
		(next: number) => {
			settingsRef.current = { ...settingsRef.current, wallPenalty: next };
			send({ type: "settings", ...settingsRef.current });
			setWallPenaltyState(next);
		},
		[send],
	);

	// One worker per mount; its first frame is a fresh sim at step 0.
	useEffect(() => {
		const worker = new Worker(new URL("../sim/worker.ts", import.meta.url), { type: "module" });
		worker.addEventListener("message", (e: MessageEvent<SimReply>) => receive(e.data));
		workerRef.current = worker;
		send({ type: "reset", epoch: discard(), ...settingsRef.current });
		return () => {
			worker.terminate();
			workerRef.current = null;
		};
	}, [receive, send, discard]);

	useEffect(() => {
		paint(1);
		return cancelFrame;
	}, [paint, cancelFrame]);

	// Keeps the canvas at one pixel per screen pixel, so it stays sharp at any size. Resizing
	// clears it, so it repaints at once, paused or not.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const observer = new ResizeObserver(([entry]) => {
			const size = Math.round(entry.contentBoxSize[0].inlineSize * window.devicePixelRatio);
			if (size === 0 || size === canvas.width) return;
			canvas.width = size;
			canvas.height = size;
			paint(paintedTRef.current);
		});
		observer.observe(canvas);
		return () => observer.disconnect();
	}, [paint]);

	return {
		canvasRef,
		snap,
		status,
		mutation,
		wallPenalty,
		stepsPerSecond,
		topFilter,
		run,
		pause,
		stepOnce,
		setSpeed,
		randomizeBrains,
		reset,
		inspect,
		setTopFilter,
		follow,
		pick,
		followedGenome,
		setMutation,
		setWallPenalty,
	};
}
