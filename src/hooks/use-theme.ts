import { useCallback, useEffect, useState } from "react";
import { readSetting, writeSetting } from "@/lib/storage";

export type Theme = "light" | "dark";

// index.html reads the same key before first paint so the page never flashes the wrong theme.
const storageKey = "theme";

/** The saved theme, else the system setting. */
function initialTheme(): Theme {
	const stored = readSetting(storageKey);
	if (stored === "light" || stored === "dark") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
	const [theme, setTheme] = useState(initialTheme);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme((current) => {
			const next = current === "dark" ? "light" : "dark";
			writeSetting(storageKey, next);
			return next;
		});
	}, []);

	return { theme, toggleTheme };
}
