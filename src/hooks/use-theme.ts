import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

// index.html reads the same key before first paint so the page never flashes the wrong theme.
const storageKey = "theme";

function initialTheme(): Theme {
	try {
		const stored = localStorage.getItem(storageKey);
		if (stored === "light" || stored === "dark") return stored;
	} catch {
		// Storage blocked (private window, sandbox): fall through to the system setting.
	}
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
			try {
				localStorage.setItem(storageKey, next);
			} catch {
				// Not saved; the toggle still works for this visit.
			}
			return next;
		});
	}, []);

	return { theme, toggleTheme };
}
