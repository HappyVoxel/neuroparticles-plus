import { useEffect } from "react";
import { useShortcut } from "@/hooks/use-shortcut";
import { isShortcut } from "@/lib/keyboard";

/**
 * Space runs or pauses the sim from anywhere on the page (see `useShortcut`). It never presses the
 * focused button: after a click on Randomize, Space still means run/pause.
 */
export function useRunShortcut(onToggle: () => void, enabled: boolean): void {
	useShortcut(" ", onToggle, enabled);
	useEffect(() => {
		// A focused button clicks on Space's keyup; cancel both halves of the press.
		const cancel = (e: KeyboardEvent) => {
			if (isShortcut(e, " ")) e.preventDefault();
		};
		window.addEventListener("keydown", cancel);
		window.addEventListener("keyup", cancel);
		return () => {
			window.removeEventListener("keydown", cancel);
			window.removeEventListener("keyup", cancel);
		};
	}, []);
}
