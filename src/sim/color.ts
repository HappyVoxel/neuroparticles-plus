import { birthDotSize, matureAge, minDotOpacity, primeHp } from "./config";
import { clamp } from "./math";
import type { Oklch } from "./types";

/** The color `t` (0–1) of the way along `shades`, blending the two nearest shades. */
export function shadeAt(shades: readonly Oklch[], t: number): Oklch {
	const last = shades.length - 1;
	const pos = clamp(t, 0, 1) * last;
	const i = Math.min(Math.floor(pos), last - 1);
	const f = pos - i;
	const mix = (a: number, b: number) => a * (1 - f) + b * f;
	const [l0, c0, h0] = shades[i];
	const [l1, c1, h1] = shades[i + 1];
	return [mix(l0, l1), mix(c0, c1), mix(h0, h1)];
}

/** Full HP (or more) draws solid; a dot fades to `minDotOpacity` as its HP runs down to 0. */
export function hpOpacity(hp: number): number {
	return minDotOpacity + (1 - minDotOpacity) * clamp(hp / primeHp, 0, 1);
}

/** A dot's side as a share of a cell: `birthDotSize` at birth, a full cell from `matureAge` on. */
export function dotSizeAt(lifetime: number): number {
	return birthDotSize + (1 - birthDotSize) * Math.min(1, lifetime / matureAge);
}

export function oklchCss([l, c, h]: Oklch, alpha = 1): string {
	return alpha === 1 ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${alpha})`;
}
