const numberFormat = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
	return numberFormat.format(n);
}

/** `cells` as a CSS percentage of `total`, for placing things over the canvas. */
export function percent(cells: number, total: number): string {
	return `${(cells / total) * 100}%`;
}
