import { useCallback, useEffect, useRef, useState } from "react";
import { type Area, agentsIn } from "@/sim/area";
import { loadSimSettings, saveSimSettings } from "@/hooks/sim-settings";
import { readSetting, writeSetting } from "@/lib/storage";
import {
	loupePickCells,
	maxSlidingStepsPerSecond,
	pickCells,
	stepBudgetMs,
	topDotsShown,
} from "@/sim/config";
import { type DotRef, findDot, isDead, leaderIds, nearestDot, topDots } from "@/sim/records";
import { draw } from "@/sim/render";
import { createSim, extinctSpecies, recreate, step } from "@/sim/simulation";
import type {
	Agent,
	DeadAgent,
	DiseaseArea,
	Genome,
	MutationParams,
	Ranking,
	Sim,
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

/** A dot's record for React, without its genome (about 100 KB). */
export interface DotView {
	/** Index in `Sim.species`. */
	species: number;
	agent: Omit<Agent, "genome"> | Omit<DeadAgent, "genome">;
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
	followed: DotView | null;
	/** The best `topDotsShown` dots the top-dots filter lets through, per ranking. */
	top: Record<Ranking, DotView[]>;
	/** The disease areas on the field, for their labels. */
	diseaseAreas: readonly DiseaseArea[];
}

function speciesStats(agents: readonly Agent[]): SpeciesStats {
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

function dotView({ species, agent }: DotRef): DotView {
	const { genome: _, ...rest } = agent;
	return { species, agent: rest };
}

function snapshot(
	sim: Sim,
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
		followed: followed && dotView(followed),
		top: {
			kills: topDots(sim, "kills", topDotsShown, filter).map(dotView),
			lifetime: topDots(sim, "lifetime", topDotsShown, filter).map(dotView),
		},
		diseaseAreas: sim.disease.areas,
	};
}

const isOver = (sim: Sim): boolean => extinctSpecies(sim).length > 0;

/**
 * Runs the simulation outside React on one animation-frame loop: each frame runs the steps that
 * are due at the chosen speed, draws the canvas once and hands React a fresh snapshot. Speed,
 * walls, mutation and the top-dots filter start from the values saved in `localStorage` and are
 * saved on every change.
 */
export function useSimulation() {
	const [saved] = useState(() => loadSimSettings(readSetting));
	const [initialSim] = useState(() => createSim(saved.mutation, saved.wallPenalty));
	const simRef = useRef(initialSim);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameRef = useRef<number | undefined>(undefined);
	const lastFrameRef = useRef(0);
	/** Steps owed to the clock; the part below 1 is how far the frame is into the next step. */
	const dueRef = useRef(0);
	const speedRef = useRef(saved.stepsPerSecond);
	const areaRef = useRef<Area | null>(null);
	/** The followed dot as last seen: alive, or at its death once it is gone. */
	const followRef = useRef<DotRef | null>(null);
	const topFilterRef = useRef(saved.topDots);

	const [snap, setSnap] = useState(() => snapshot(initialSim, null, null, saved.topDots));
	const [running, setRunning] = useState(false);
	const [mutation, setMutationState] = useState(saved.mutation);
	const [wallPenalty, setWallPenaltyState] = useState(initialSim.wallPenalty);
	const [stepsPerSecond, setStepsPerSecond] = useState(saved.stepsPerSecond);
	const [topFilter, setTopFilterState] = useState(saved.topDots);

	useEffect(() => {
		saveSimSettings({ mutation, wallPenalty, stepsPerSecond, topDots: topFilter }, writeSetting);
	}, [mutation, wallPenalty, stepsPerSecond, topFilter]);

	const status: RunStatus = snap.extinct.length > 0 ? "stopped" : running ? "running" : "paused";

	const paint = useCallback((t: number) => {
		const ctx = canvasRef.current?.getContext("2d");
		const sim = simRef.current;
		if (!ctx) return;
		const followId = followRef.current?.agent.id ?? null;
		const glowIds = leaderIds(sim, "lifetime");
		const swordsIds = leaderIds(sim, "kills");
		draw(ctx, sim.species, sim.disease.areas, t, followId, glowIds, swordsIds, performance.now());
	}, []);

	/** Runs one step and keeps the followed dot's record current, including its death. */
	const advance = useCallback(() => {
		simRef.current = step(simRef.current);
		const followed = followRef.current;
		if (followed && !isDead(followed.agent)) {
			followRef.current = findDot(simRef.current, followed.agent.id) ?? followed;
		}
	}, []);

	const publish = useCallback(() => {
		setSnap(snapshot(simRef.current, areaRef.current, followRef.current, topFilterRef.current));
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

			const started = performance.now();
			let stepped = false;
			let extinct = false;
			while (dueRef.current >= 1 && !extinct) {
				// Out of time: drop the steps still owed, so the sim slows down instead of the frames.
				if (performance.now() - started > stepBudgetMs) {
					dueRef.current = 0;
					break;
				}
				advance();
				dueRef.current -= 1;
				stepped = true;
				extinct = isOver(simRef.current);
			}

			if (stepped) publish();
			if (extinct) {
				frameRef.current = undefined;
				paint(1);
				setRunning(false);
				return;
			}
			paint(speedRef.current <= maxSlidingStepsPerSecond ? dueRef.current : 1);
			frameRef.current = window.requestAnimationFrame(frame);
		},
		[paint, advance, publish],
	);

	const run = useCallback(() => {
		if (frameRef.current !== undefined || isOver(simRef.current)) return;
		lastFrameRef.current = performance.now();
		frameRef.current = window.requestAnimationFrame(frame);
		setRunning(true);
	}, [frame]);

	const pause = useCallback(() => {
		cancelFrame();
		setRunning(false);
	}, [cancelFrame]);

	const stepOnce = useCallback(() => {
		if (isOver(simRef.current)) return;
		advance();
		// A whole step is shown, so the next Run starts its slide from these cells.
		dueRef.current = 1;
		paint(1);
		publish();
	}, [paint, advance, publish]);

	const setSpeed = useCallback((next: number) => {
		speedRef.current = next;
		setStepsPerSecond(next);
	}, []);

	/** New brains make new dots with new ids, so the followed dot is let go. */
	const randomizeBrains = useCallback(() => {
		simRef.current = recreate(simRef.current);
		followRef.current = null;
		paint(1);
		publish();
	}, [paint, publish]);

	/** Starts a new run at step 0 with fresh random dots; keeps the mutation and wall settings. */
	const reset = useCallback(() => {
		cancelFrame();
		const { mutation, wallPenalty } = simRef.current;
		simRef.current = createSim(mutation, wallPenalty);
		dueRef.current = 0;
		areaRef.current = null;
		followRef.current = null;
		paint(1);
		publish();
		setRunning(false);
	}, [cancelFrame, paint, publish]);

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
			followRef.current = id === null ? null : findDot(simRef.current, id);
			paint(1);
			publish();
		},
		[paint, publish],
	);

	/**
	 * Follows the living dot nearest to a cell: within `loupePickCells` when `precise` (the loupe
	 * is on), `pickCells` otherwise. With none that close it stops following. True when it found one.
	 */
	const pick = useCallback(
		(x: number, y: number, precise: boolean): boolean => {
			const found = nearestDot(simRef.current, x, y, precise ? loupePickCells : pickCells);
			follow(found?.agent.id ?? null);
			return found !== null;
		},
		[follow],
	);

	/** The followed dot's genome, for copying; null when none is followed. */
	const followedGenome = useCallback((): Genome | null => {
		return followRef.current?.agent.genome ?? null;
	}, []);

	const setMutation = useCallback((next: MutationParams) => {
		simRef.current = { ...simRef.current, mutation: next };
		setMutationState(next);
	}, []);

	const setWallPenalty = useCallback((next: number) => {
		simRef.current = { ...simRef.current, wallPenalty: next };
		setWallPenaltyState(next);
	}, []);

	useEffect(() => {
		paint(1);
		return cancelFrame;
	}, [paint, cancelFrame]);

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
