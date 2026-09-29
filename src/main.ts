import { cellPixels, gridHeight, gridWidth } from "./config";
import { draw } from "./render";
import { createSim, extinctSpecies, recreate, step } from "./simulation";
import type { MutationParams } from "./types";

function byId<T extends HTMLElement>(id: string, type: new () => T): T {
	const el = document.getElementById(id);
	if (!(el instanceof type)) throw new Error(`#${id} is missing or not a ${type.name}`);
	return el;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("2D canvas is not supported");
	return ctx;
}

const canvas = byId("world", HTMLCanvasElement);
const percentInput = byId("mutatepercent", HTMLInputElement);
const genesInput = byId("mutategen", HTMLInputElement);
const stepOut = byId("step", HTMLDivElement);
const populationOut = byId("population", HTMLDivElement);
const lifetimeOut = byId("max-lifetime", HTMLDivElement);
const paramsOut = byId("params", HTMLDivElement);

canvas.width = gridWidth * cellPixels;
canvas.height = gridHeight * cellPixels;
const ctx = context2d(canvas);

function readMutation(): MutationParams {
	return { percent: Number(percentInput.value), genes: Number(genesInput.value) };
}

let sim = createSim(readMutation());
let timer: number | undefined;
draw(ctx, sim.species);

function stop(): void {
	window.clearInterval(timer);
	timer = undefined;
}

function tick(): void {
	if (extinctSpecies(sim).length > 0) return stop();

	sim = step(sim);
	draw(ctx, sim.species);
	stepOut.textContent = String(sim.step);
	populationOut.textContent = sim.species.map((s) => s.agents.length).join(",");
	lifetimeOut.textContent = sim.species
		.map((s) => Math.max(0, ...s.agents.map((a) => a.lifetime)))
		.join(", ");

	const extinct = extinctSpecies(sim);
	if (extinct.length > 0) {
		stop();
		stepOut.textContent += ` (${extinct.join(", ")} died out, sim stopped)`;
	}
}

function syncParams(): void {
	sim = { ...sim, mutation: readMutation() };
	paramsOut.textContent = `mutation: ${sim.mutation.percent}%, gens: ${sim.mutation.genes}`;
}

byId("start", HTMLButtonElement).addEventListener("click", () => {
	timer ??= window.setInterval(tick, 1);
});
byId("stop", HTMLButtonElement).addEventListener("click", stop);
byId("one", HTMLButtonElement).addEventListener("click", tick);
byId("recreate", HTMLButtonElement).addEventListener("click", () => {
	sim = recreate(sim);
});
percentInput.addEventListener("input", syncParams);
genesInput.addEventListener("input", syncParams);
