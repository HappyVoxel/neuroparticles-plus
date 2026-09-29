import type { Rgb } from "@/sim/types";

const numberFormat = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
	return numberFormat.format(n);
}

export function rgbCss([r, g, b]: Rgb): string {
	return `rgb(${r} ${g} ${b})`;
}
