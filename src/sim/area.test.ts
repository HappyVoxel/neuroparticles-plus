import { describe, expect, it } from "vitest";
import { agentsIn, areaFromCorners } from "./area";
import { gridHeight, gridWidth } from "./config";
import { spawn } from "./evolution";
import type { Agent } from "./types";

const agent = (x: number, y: number): Agent => ({
	...spawn({ id: 0, genome: [] }, { x, y }),
	hp: 1000,
});

describe("areaFromCorners", () => {
	it("spans the two cells in either order", () => {
		const area = { x0: 3, y0: 4, x1: 10, y1: 20 };
		expect(areaFromCorners({ x: 3, y: 4 }, { x: 10, y: 20 })).toEqual(area);
		expect(areaFromCorners({ x: 10, y: 20 }, { x: 3, y: 4 })).toEqual(area);
		expect(areaFromCorners({ x: 10, y: 4 }, { x: 3, y: 20 })).toEqual(area);
	});

	it("cuts corners past the edges to the grid", () => {
		expect(areaFromCorners({ x: -5, y: -1 }, { x: gridWidth + 3, y: gridHeight })).toEqual({
			x0: 0,
			y0: 0,
			x1: gridWidth - 1,
			y1: gridHeight - 1,
		});
	});
});

describe("agentsIn", () => {
	it("keeps agents on the edge cells and drops the ones outside", () => {
		const area = { x0: 5, y0: 5, x1: 7, y1: 9 };
		const inside = [agent(5, 5), agent(7, 9), agent(6, 7)];
		const outside = [agent(4, 5), agent(8, 9), agent(6, 4), agent(6, 10)];
		expect(agentsIn([...outside, ...inside], area)).toEqual(inside);
	});
});
