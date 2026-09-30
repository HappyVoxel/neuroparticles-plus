import { useCallback, useEffect, useRef, useState } from "react";
import { type Area, agentsIn } from "@/sim/area";
import { defaultStepsPerSecond, maxSlidingStepsPerSecond, stepBudgetMs } from "@/sim/config";
import { oklchCss, shadeAt } from "@/sim/color";
import { draw } from "@/sim/render";
import { createSim, extinctSpecies, recreate, step } from "@/sim/simulation";
import type { Agent, MutationParams, Sim, Species } from "@/sim/types";

export type RunStatus = "paused" | "running" | "stopped";

export interface SpeciesStats {
	id: Species["id"];
	name: string;
	/** CSS color for the sidebar: the middle of the species' shades. */
	color: string;
	population: number;
	/** Longest lifetime among living agents, in steps. */
	oldest: number;
	/** Mean lifetime in steps; 0 with no agents. */
	averageAge: number;
	/** Mean HP; 0 with no agents. */
	averageHp: number;
}

export interface SimSnapshot {
	step: number;
	species: SpeciesStats[];
	/** The same stats for the agents inside the inspected area, or null with no area. */
	areaSpecies: SpeciesStats[] | null;
	/** The inspected area, or null. */
	area: Area | null;
}

function speciesStats({ id, name, shades }: Species, agents: readonly Agent[]): SpeciesStats {
	let oldest = 0;
	let ageSum = 0;
	let hpSum = 0;
	for (let i = 0; i < agents.length; i++) {
		oldest = Math.max(oldest, agents[i].lifetime);
		ageSum += agents[i].lifetime;
		hpSum += agents[i].hp;
	}
	const n = agents.length;
	return {
		id,
		name,
		color: oklchCss(shadeAt(shades, 0.5)),
		population: n,
		oldest,
		averageAge: n > 0 ? ageSum / n : 0,
		averageHp: n > 0 ? hpSum / n : 0,
	};
}

function snapshot(sim: Sim, area: Area | null): SimSnapshot {
	return {
		step: sim.step,
		species: sim.species.map((s) => speciesStats(s, s.agents)),
		areaSpecies: area && sim.species.map((s) => speciesStats(s, agentsIn(s.agents, area))),
		area,
	};
}

const isOver = (sim: Sim): boolean => extinctSpecies(sim).length > 0;

/**
 * Runs the simulation outside React on one animation-frame loop: each frame runs the steps that
 * are due at the chosen speed, draws the canvas once and hands React a fresh snapshot.
 */
export function useSimulation(initialMutation: MutationParams) {
	const [initialSim] = useState(() => createSim(initialMutation));
	const simRef = useRef(initialSim);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameRef = useRef<number | undefined>(undefined);
	const lastFrameRef = useRef(0);
	/** Steps owed to the clock; the part below 1 is how far the frame is into the next step. */
	const dueRef = useRef(0);
	const speedRef = useRef(defaultStepsPerSecond);
	const areaRef = useRef<Area | null>(null);

	const [snap, setSnap] = useState(() => snapshot(initialSim, null));
	const [running, setRunning] = useState(false);
	const [mutation, setMutationState] = useState(initialMutation);
	const [wallPenalty, setWallPenaltyState] = useState(initialSim.wallPenalty);
	const [stepsPerSecond, setStepsPerSecond] = useState(defaultStepsPerSecond);

	const over = snap.species.some((s) => s.population === 0);
	const status: RunStatus = over ? "stopped" : running ? "running" : "paused";

	const paint = useCallback((t: number) => {
		const ctx = canvasRef.current?.getContext("2d");
		if (ctx) draw(ctx, simRef.current.species, simRef.current.disease.areas, t);
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
				simRef.current = step(simRef.current);
				dueRef.current -= 1;
				stepped = true;
				extinct = isOver(simRef.current);
			}

			if (stepped) setSnap(snapshot(simRef.current, areaRef.current));
			if (extinct) {
				frameRef.current = undefined;
				paint(1);
				setRunning(false);
				return;
			}
			paint(speedRef.current <= maxSlidingStepsPerSecond ? dueRef.current : 1);
			frameRef.current = window.requestAnimationFrame(frame);
		},
		[paint],
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
		simRef.current = step(simRef.current);
		// A whole step is shown, so the next Run starts its slide from these cells.
		dueRef.current = 1;
		paint(1);
		setSnap(snapshot(simRef.current, areaRef.current));
	}, [paint]);

	const setSpeed = useCallback((next: number) => {
		speedRef.current = next;
		setStepsPerSecond(next);
	}, []);

	const randomizeBrains = useCallback(() => {
		simRef.current = recreate(simRef.current);
	}, []);

	/** Starts a new run at step 0 with fresh random dots; keeps the mutation and wall settings. */
	const reset = useCallback(() => {
		cancelFrame();
		const { mutation, wallPenalty } = simRef.current;
		simRef.current = createSim(mutation, wallPenalty);
		dueRef.current = 0;
		areaRef.current = null;
		paint(1);
		setSnap(snapshot(simRef.current, null));
		setRunning(false);
	}, [cancelFrame, paint]);

	/** Sets the area every snapshot carries, with its stats in `areaSpecies`; null clears it. */
	const inspect = useCallback((next: Area | null) => {
		areaRef.current = next;
		setSnap(snapshot(simRef.current, next));
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
		run,
		pause,
		stepOnce,
		setSpeed,
		randomizeBrains,
		reset,
		inspect,
		setMutation,
		setWallPenalty,
	};
}
