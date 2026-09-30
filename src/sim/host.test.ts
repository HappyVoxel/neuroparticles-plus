import { describe, expect, it } from "vitest";
import { stepsAhead } from "./config";
import { createHost, type SimReply, type SimRequest } from "./host";
import type { SimView } from "./types";

const mutation = { percent: 5, genes: 1 };

function host() {
	const replies: SimReply[] = [];
	const handle = createHost((reply) => replies.push(reply));
	const send = (request: SimRequest) => handle(request);
	const frames = () => replies.flatMap((r) => (r.type === "frame" ? [r] : []));
	const lastView = (): SimView => frames()[frames().length - 1].view;
	send({ type: "reset", epoch: 1, mutation, wallPenalty: 10 });
	return { replies, send, frames, lastView };
}

describe("createHost", () => {
	it("answers reset with a replace frame at step 0, without genomes", () => {
		const { frames } = host();
		const [first] = frames();
		expect(first).toMatchObject({ epoch: 1, kind: "replace" });
		expect(first.view.step).toBe(0);
		expect(first.view.species[0].agents.length).toBeGreaterThan(0);
		expect("genome" in first.view.species[0].agents[0]).toBe(false);
	});

	it("answers each step with the next step, echoing its epoch", () => {
		const { send, frames } = host();
		send({ type: "step", epoch: 1 });
		send({ type: "step", epoch: 2 });
		expect(
			frames()
				.slice(1)
				.map((f) => [f.kind, f.epoch, f.view.step]),
		).toEqual([
			["step", 1, 1],
			["step", 2, 2],
		]);
	});

	it("rewinds to a kept step and runs on from it", () => {
		const { send, lastView } = host();
		for (let i = 0; i < stepsAhead; i++) send({ type: "step", epoch: 1 });
		send({ type: "rewind", epoch: 2, step: 1 });
		send({ type: "step", epoch: 2 });
		expect(lastView().step).toBe(2);
	});

	it("refuses to rewind past the steps it keeps", () => {
		const { send } = host();
		for (let i = 0; i < stepsAhead + 1; i++) send({ type: "step", epoch: 1 });
		expect(() => send({ type: "rewind", epoch: 2, step: 0 })).toThrow();
	});

	it("recreates at the rewound step: same cells, new ids", () => {
		const { send, frames, lastView } = host();
		send({ type: "step", epoch: 1 });
		send({ type: "step", epoch: 1 });
		const atOne = frames()[1].view;
		send({ type: "recreate", epoch: 2, step: 1 });
		const after = lastView();
		expect(frames()[frames().length - 1]).toMatchObject({ kind: "replace", epoch: 2 });
		expect(after.step).toBe(1);
		const cells = (v: SimView) => v.species[0].agents.map((a) => [a.x, a.y]);
		expect(cells(after)).toEqual(cells(atOne));
		expect(after.species[0].agents[0].id).not.toBe(atOne.species[0].agents[0].id);
	});

	it("sends back the genome of a followed dot, or null for an unknown id", () => {
		const { send, replies, lastView } = host();
		const id = lastView().species[1].agents[0].id;
		send({ type: "follow", id });
		send({ type: "follow", id: -1 });
		const genomes = replies.flatMap((r) => (r.type === "genome" ? [r] : []));
		expect(genomes[0].id).toBe(id);
		expect(genomes[0].genome?.length).toBeGreaterThan(0);
		expect(genomes[1]).toEqual({ type: "genome", id: -1, genome: null });
	});
});
