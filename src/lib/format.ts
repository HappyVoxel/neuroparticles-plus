const numberFormat = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
	return numberFormat.format(n);
}
