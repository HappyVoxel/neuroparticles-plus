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
	it("sizes the three blocks for 484 inputs, 25 hidden, 17 outputs", () => {
		expect(inputSize).toBe(484);
		expect(hiddenWeightsFrom).toBe(484 * 25);
		expect(biasFrom).toBe(484 * 25 + 25 * 17);
		expect(genomeSize).toBe(12550);
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

	it("gives the same scores as summing every input, zeros included", () => {
		const genome = randomGenome();
		const input = new Array<number>(inputSize).fill(0);
		for (const k of [0, 7, 181, 362]) input[k] = 1 + (k % 3);

		const expected = new Array<number>(outputSize).fill(0);
		for (let j = 0; j < hiddenSize; j++) {
			let sum = 0;
			for (let k = 0; k < inputSize; k++) sum += input[k] * genome[j * inputSize + k];
			const hidden = 1 / (1 + Math.exp(-(sum + genome[biasFrom + j])));
			for (let o = 0; o < outputSize; o++) {
				expected[o] += hidden * genome[hiddenWeightsFrom + o * hiddenSize + j];
			}
		}

		expect(evaluate(input, genome)).toEqual(expected);
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

	it("picks a knight jump", () => {
		const output = new Array<number>(outputSize).fill(0);
		output[outputSize - 1] = 9;
		expect(pickMove(output)).toBe(16);
	});

	it("gives stay a head start of stayBias", () => {
		expect(pickMove([0, 0, stayBias - 0.1, 0, 0, 0, 0, 0, 0])).toBe(4);
		expect(pickMove([0, 0, stayBias + 0.1, 0, 0, 0, 0, 0, 0])).toBe(2);
	});

	it("only compares the first count moves", () => {
		const output = new Array<number>(outputSize).fill(0);
		output[2] = 5;
		output[outputSize - 1] = 9;
		expect(pickMove(output, 9)).toBe(2);
		expect(pickMove(output)).toBe(16);
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
