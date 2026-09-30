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
