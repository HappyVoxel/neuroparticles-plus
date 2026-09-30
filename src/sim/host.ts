import { stepsAhead } from "./config";
import { createSim, recreate, step } from "./simulation";
import type { Agent, Genome, MutationParams, Sim, SimView } from "./types";

/**
 * What the page asks the worker. `epoch` goes up each time the page throws away the steps it
 * asked for (pause, Randomize, Reset); the worker sends it back on each frame, so the page can
 * drop frames of an older epoch.
 */
export type SimRequest =
	| { type: "reset"; epoch: number; mutation: MutationParams; wallPenalty: number }
	| { type: "step"; epoch: number }
	/** Goes back to `step`, the step on the canvas, dropping the steps run ahead of it. */
	| { type: "rewind"; epoch: number; step: number }
	/** Goes back to `step`, then gives every dot a new brain. */
	| { type: "recreate"; epoch: number; step: number }
	| { type: "settings"; mutation: MutationParams; wallPenalty: number }
	/** Sends back the genome of the dot with this id, so the page can copy it. */
	| { type: "follow"; id: number };

/** A `step` frame comes after the one on the canvas; a `replace` frame takes its place. */
export type SimReply =
	| { type: "frame"; epoch: number; kind: "step" | "replace"; view: SimView }
	| { type: "genome"; id: number; genome: Genome | null };

const withoutGenome = <A extends Agent>({ genome: _, ...rest }: A): Omit<A, "genome"> => rest;

/** The sim without what the page doesn't need, small enough to copy to it every step. */
export function simView({ species, step, disease }: Sim): SimView {
	return {
		step,
		disease: { areas: disease.areas },
		species: species.map(({ id, name, shades, agents, hallOfFame, lastDeaths }) => ({
			id,
			name,
			shades,
			agents: agents.map(withoutGenome),
			lastDeaths: lastDeaths.map(withoutGenome),
			hallOfFame: {
				kills: hallOfFame.kills.map(withoutGenome),
				lifetime: hallOfFame.lifetime.map(withoutGenome),
			},
		})),
	};
}

/** The genome of the dot with this id in any of the sims: living, just died or in a hall of fame. */
function genomeOf(sims: readonly Sim[], id: number): Genome | null {
	for (const sim of sims) {
		for (const { agents, lastDeaths, hallOfFame } of sim.species) {
			for (const dots of [agents, lastDeaths, hallOfFame.kills, hallOfFame.lifetime]) {
				const dot = dots.find((a) => a.id === id);
				if (dot) return dot.genome;
			}
		}
	}
	return null;
}

/**
 * The worker's side: owns the sim and answers each request through `post`. It keeps the last
 * `stepsAhead + 1` sims, which reach back to the one on the canvas, so the page can rewind to it.
 * No DOM or worker API here, so tests drive it directly.
 */
export function createHost(post: (reply: SimReply) => void): (request: SimRequest) => void {
	let history: Sim[] = [];
	let mutation: MutationParams = { percent: 0, genes: 0 };
	let wallPenalty = 0;

	const current = (): Sim => history[history.length - 1];
	const frame = (epoch: number, kind: "step" | "replace") =>
		post({ type: "frame", epoch, kind, view: simView(current()) });
	const rewind = (to: number) => {
		const at = history.findIndex((sim) => sim.step === to);
		if (at < 0) throw new Error(`step ${to} is no longer kept`);
		history = history.slice(0, at + 1);
		history[at] = { ...history[at], mutation, wallPenalty };
	};

	return (request) => {
		switch (request.type) {
			case "reset":
				({ mutation, wallPenalty } = request);
				history = [createSim(mutation, wallPenalty)];
				frame(request.epoch, "replace");
				return;
			case "step":
				history = [...history, step(current())].slice(-(stepsAhead + 1));
				frame(request.epoch, "step");
				return;
			case "rewind":
				rewind(request.step);
				return;
			case "recreate":
				rewind(request.step);
				history[history.length - 1] = recreate(current());
				frame(request.epoch, "replace");
				return;
			case "settings":
				({ mutation, wallPenalty } = request);
				history[history.length - 1] = { ...current(), mutation, wallPenalty };
				return;
			case "follow":
				post({ type: "genome", id: request.id, genome: genomeOf(history, request.id) });
				return;
		}
	};
}
