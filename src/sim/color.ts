import { startHp } from "./config";
import type { Oklch } from "./types";

/** The color `t` (0–1) of the way along `shades`, blending the two nearest shades. */
export function shadeAt(shades: readonly Oklch[], t: number): Oklch {
	const last = shades.length - 1;
	const pos = Math.min(Math.max(t, 0), 1) * last;
	const i = Math.min(Math.floor(pos), last - 1);
	const f = pos - i;
	const mix = (a: number, b: number) => a * (1 - f) + b * f;
	const [l0, c0, h0] = shades[i];
	const [l1, c1, h1] = shades[i + 1];
	return [mix(l0, l1), mix(c0, c1), mix(h0, h1)];
}

/** Full HP (or more) draws solid; a dot fades out as its HP runs down to 0. */
export function hpOpacity(hp: number): number {
	return Math.min(Math.max(hp / startHp, 0), 1);
}

export function oklchCss([l, c, h]: Oklch): string {
	return `oklch(${l} ${c} ${h})`;
}
