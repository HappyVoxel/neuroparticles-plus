import { useCallback, useEffect, useRef, useState } from "react";
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
 * Runs the simulation outside React: the sim steps every 1 ms and draws straight to the canvas,
 * while React only gets a fresh snapshot once per animation frame.
 */
export function useSimulation(initialMutation: MutationParams) {
	const [initialSim] = useState(() => createSim(initialMutation));
	const simRef = useRef(initialSim);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const timerRef = useRef<number | undefined>(undefined);
	const frameRef = useRef<number | undefined>(undefined);

	const [snap, setSnap] = useState(() => snapshot(initialSim));
	const [status, setStatus] = useState<RunStatus>("paused");
	const [mutation, setMutationState] = useState(initialMutation);

	const paint = useCallback(() => {
		const ctx = canvasRef.current?.getContext("2d");
		if (ctx) draw(ctx, simRef.current.species);
	}, []);

	const publish = useCallback(() => {
		frameRef.current ??= window.requestAnimationFrame(() => {
			frameRef.current = undefined;
			setSnap(snapshot(simRef.current));
		});
	}, []);

	const clearTimer = useCallback(() => {
		window.clearInterval(timerRef.current);
		timerRef.current = undefined;
	}, []);

	const tick = useCallback(() => {
		if (extinctSpecies(simRef.current).length > 0) return;
		simRef.current = step(simRef.current);
		paint();
		publish();
		if (extinctSpecies(simRef.current).length > 0) {
			clearTimer();
			setStatus("stopped");
		}
	}, [paint, publish, clearTimer]);

	const run = useCallback(() => {
		if (timerRef.current !== undefined || extinctSpecies(simRef.current).length > 0) return;
		timerRef.current = window.setInterval(tick, 1);
		setStatus("running");
	}, [tick]);

	const pause = useCallback(() => {
		clearTimer();
		setStatus((s) => (s === "running" ? "paused" : s));
	}, [clearTimer]);

	const randomizeBrains = useCallback(() => {
		simRef.current = recreate(simRef.current);
	}, []);

	const setMutation = useCallback((next: MutationParams) => {
		simRef.current = { ...simRef.current, mutation: next };
		setMutationState(next);
	}, []);

	useEffect(() => {
		paint();
		return () => {
			clearTimer();
			if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current);
		};
	}, [paint, clearTimer]);

	return {
		canvasRef,
		snap,
		status,
		mutation,
		run,
		pause,
		stepOnce: tick,
		randomizeBrains,
		setMutation,
	};
}
