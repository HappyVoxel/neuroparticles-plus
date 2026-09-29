import { useCallback, useEffect, useRef, useState } from "react";
import { defaultStepsPerSecond, maxSlidingStepsPerSecond, stepBudgetMs } from "@/sim/config";
import { draw } from "@/sim/render";
import { createSim, extinctSpecies, recreate, step } from "@/sim/simulation";
import type { MutationParams, Rgb, Sim, Species } from "@/sim/types";

export type RunStatus = "paused" | "running" | "stopped";

export interface SpeciesStats {
	id: Species["id"];
	name: string;
	color: Rgb;
	population: number;
	/** Longest lifetime among living agents, in steps. */
	oldest: number;
}

export interface SimSnapshot {
	step: number;
	species: SpeciesStats[];
	extinct: Species["name"][];
}

function snapshot(sim: Sim): SimSnapshot {
	return {
		step: sim.step,
		species: sim.species.map(({ id, name, color, agents }) => ({
			id,
			name,
			color,
			population: agents.length,
			oldest: Math.max(0, ...agents.map((a) => a.lifetime)),
		})),
		extinct: sim.species.filter((s) => s.agents.length === 0).map((s) => s.name),
	};
}

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

	const [snap, setSnap] = useState(() => snapshot(initialSim));
	const [status, setStatus] = useState<RunStatus>("paused");
	const [mutation, setMutationState] = useState(initialMutation);
	const [stepsPerSecond, setStepsPerSecond] = useState(defaultStepsPerSecond);

	const paint = useCallback((t: number) => {
		const ctx = canvasRef.current?.getContext("2d");
		if (ctx) draw(ctx, simRef.current.species, t);
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
				extinct = extinctSpecies(simRef.current).length > 0;
			}

			if (stepped) setSnap(snapshot(simRef.current));
			if (extinct) {
				frameRef.current = undefined;
				paint(1);
				setStatus("stopped");
				return;
			}
			paint(speedRef.current <= maxSlidingStepsPerSecond ? dueRef.current : 1);
			frameRef.current = window.requestAnimationFrame(frame);
		},
		[paint],
	);

	const run = useCallback(() => {
		if (frameRef.current !== undefined || extinctSpecies(simRef.current).length > 0) return;
		lastFrameRef.current = performance.now();
		frameRef.current = window.requestAnimationFrame(frame);
		setStatus("running");
	}, [frame]);

	const pause = useCallback(() => {
		cancelFrame();
		setStatus((s) => (s === "running" ? "paused" : s));
	}, [cancelFrame]);

	const stepOnce = useCallback(() => {
		if (extinctSpecies(simRef.current).length > 0) return;
		simRef.current = step(simRef.current);
		// A whole step is shown, so the next Run starts its slide from these cells.
		dueRef.current = 1;
		paint(1);
		setSnap(snapshot(simRef.current));
		if (extinctSpecies(simRef.current).length > 0) setStatus("stopped");
	}, [paint]);

	const setSpeed = useCallback((next: number) => {
		speedRef.current = next;
		setStepsPerSecond(next);
	}, []);

	const randomizeBrains = useCallback(() => {
		simRef.current = recreate(simRef.current);
	}, []);

	const setMutation = useCallback((next: MutationParams) => {
		simRef.current = { ...simRef.current, mutation: next };
		setMutationState(next);
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
		stepsPerSecond,
		run,
		pause,
		stepOnce,
		setSpeed,
		randomizeBrains,
		setMutation,
	};
}
