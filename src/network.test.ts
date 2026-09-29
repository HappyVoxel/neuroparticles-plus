import { describe, expect, it } from "vitest";
import { hiddenSize, inputSize, outputSize, stayBias } from "./config";
import {
	biasFrom,
	evaluate,
	genomeSize,
	hiddenWeightsFrom,
	pickMove,
	randomGenome,
} from "./network";

describe("genome layout", () => {
	it("sizes the three blocks for 363 inputs, 25 hidden, 9 outputs", () => {
		expect(inputSize).toBe(363);
		expect(hiddenWeightsFrom).toBe(363 * 25);
		expect(biasFrom).toBe(363 * 25 + 25 * 9);
		expect(genomeSize).toBe(9325);
	});

	it("draws random genes in [-2, 2)", () => {
		const genome = randomGenome();
		expect(genome).toHaveLength(genomeSize);
		expect(Math.min(...genome)).toBeGreaterThanOrEqual(-2);
		expect(Math.max(...genome)).toBeLessThan(2);
	});
});

describe("evaluate", () => {
	it("outputs 0.5 × the summed hidden→output weights when everything else is zero", () => {
		const genome = new Array<number>(genomeSize).fill(0);
		for (let k = 0; k < hiddenSize; k++) genome[hiddenWeightsFrom + 7 * hiddenSize + k] = 1;
		const output = evaluate(new Array<number>(inputSize).fill(0), genome);
		expect(output).toHaveLength(outputSize);
		expect(output[7]).toBeCloseTo(0.5 * hiddenSize);
		expect(output[0]).toBe(0);
	});

	it("reads input k through weight j * inputSize + k", () => {
		const genome = new Array<number>(genomeSize).fill(0);
		genome[0 * inputSize + 10] = 100; // hidden 0 ← input 10, saturates the sigmoid
		genome[hiddenWeightsFrom + 2 * hiddenSize + 0] = 1; // output 2 ← hidden 0
		const input = new Array<number>(inputSize).fill(0);
		input[10] = 1;
		expect(evaluate(input, genome)[2]).toBeCloseTo(1);
	});

	it("adds the hidden bias before the sigmoid", () => {
		const genome = new Array<number>(genomeSize).fill(0);
		genome[biasFrom + 0] = 100;
		genome[hiddenWeightsFrom + 5 * hiddenSize + 0] = 1;
		expect(evaluate(new Array<number>(inputSize).fill(0), genome)[5]).toBeCloseTo(1);
	});
});

describe("pickMove", () => {
	it("picks the highest output", () => {
		expect(pickMove([0, 0, 0, 0, 0, 0, 0, 9, 0])).toBe(7);
	});

	it("gives stay a head start of stayBias", () => {
		expect(pickMove([0, 0, stayBias - 0.1, 0, 0, 0, 0, 0, 0])).toBe(4);
		expect(pickMove([0, 0, stayBias + 0.1, 0, 0, 0, 0, 0, 0])).toBe(2);
	});

	it("breaks ties toward the lowest index", () => {
		expect(pickMove([3, 3, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
	});

	it("does not change its input", () => {
		const output = [0, 0, 0, 0, 0, 0, 0, 0, 0];
		pickMove(output);
		expect(output[4]).toBe(0);
	});
});
