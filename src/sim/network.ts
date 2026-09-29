import { geneRange, hiddenSize, inputSize, outputSize, stayBias } from "./config";
import { type Move, stayMove } from "./movement";
import type { Genome } from "./types";

// Genome layout:
//   [0, hiddenWeightsFrom)          input→hidden weights, index j * inputSize + k
//   [hiddenWeightsFrom, biasFrom)   hidden→output weights, index hiddenWeightsFrom + j * hiddenSize + k
//   [biasFrom, genomeSize)          hidden biases
export const hiddenWeightsFrom = inputSize * hiddenSize;
export const biasFrom = hiddenWeightsFrom + hiddenSize * outputSize;
export const genomeSize = biasFrom + hiddenSize;

export function randomGene(): number {
	return Math.random() * geneRange - geneRange / 2;
}

export function randomGenome(): Genome {
	return Array.from({ length: genomeSize }, randomGene);
}

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/**
 * Forward pass. Returns one raw score per move.
 * Most of the view is empty, so the hidden layer only sums the non-zero inputs.
 */
export function evaluate(input: readonly number[], genome: Readonly<Genome>): number[] {
	const seen: number[] = [];
	for (let k = 0; k < inputSize; k++) {
		if (input[k] !== 0) seen.push(k);
	}

	const hidden = new Array<number>(hiddenSize);
	for (let j = 0; j < hiddenSize; j++) {
		let sum = 0;
		for (let n = 0; n < seen.length; n++) {
			const k = seen[n];
			sum += input[k] * genome[j * inputSize + k];
		}
		sum += genome[biasFrom + j];
		hidden[j] = sigmoid(sum);
	}

	const output = new Array<number>(outputSize).fill(0);
	for (let j = 0; j < outputSize; j++) {
		let sum = 0;
		for (let k = 0; k < hiddenSize; k++) {
			sum += hidden[k] * genome[hiddenWeightsFrom + j * hiddenSize + k];
		}
		output[j] = sum;
	}
	return output;
}

/** Highest score wins, with `stayBias` added to "stay". Ties go to the lowest index. */
export function pickMove(output: readonly number[]): Move {
	let best: Move = 0;
	let bestScore = Number.NEGATIVE_INFINITY;
	for (let j = 0; j < output.length; j++) {
		const score = output[j] + (j === stayMove ? stayBias : 0);
		if (score > bestScore) {
			bestScore = score;
			best = j as Move;
		}
	}
	return best;
}
