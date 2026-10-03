const numberFormat = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
	return numberFormat.format(n);
}

const compactFormat = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

/** A count in at most about 4 characters: 12, 4.5K, 7.3M. */
export function formatCompact(n: number): string {
	return compactFormat.format(n);
}

/** `cells` as a CSS percentage of `total`, for placing things over the canvas. */
export function percent(cells: number, total: number): string {
	return `${(cells / total) * 100}%`;
}
