/** A saved setting, or null when unset or storage is blocked (private window, sandbox). */
export function readSetting(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/** Saves a setting; when storage is blocked it holds for this visit only. */
export function writeSetting(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Not saved.
	}
}

/** A setting saved as "on" or "off"; `fallback` when unset or anything else. */
export function readFlag(key: string, fallback: boolean, read = readSetting): boolean {
	const value = read(key);
	return value === "on" || value === "off" ? value === "on" : fallback;
}

/** Saves a setting as "on" or "off". */
export function writeFlag(key: string, on: boolean, write = writeSetting): void {
	write(key, on ? "on" : "off");
}
