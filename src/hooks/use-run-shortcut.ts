import { useEffect } from "react";
import { isTyping } from "@/lib/keyboard";

const isSpace = (e: KeyboardEvent): boolean => e.code === "Space" || e.key === " ";

/** Space here is ours: not while typing, not with a modifier, not inside a confirm dialog. */
function ownsSpace(e: KeyboardEvent): boolean {
	if (!isSpace(e) || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return false;
	return !(e.target instanceof Element && e.target.closest('[role="alertdialog"]'));
}

/**
 * Space runs or pauses the sim from anywhere on the page. It never presses the focused button:
 * after a click on Randomize, Space still means run/pause. Keys typed into a field, and keys
 * inside a confirm dialog, are left alone.
 */
export function useRunShortcut(onToggle: () => void): void {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!ownsSpace(e)) return;
			e.preventDefault();
			if (!e.repeat) onToggle();
		};
		// A focused button clicks on Space's keyup; cancel that too.
		const onKeyUp = (e: KeyboardEvent) => {
			if (ownsSpace(e)) e.preventDefault();
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, [onToggle]);
}
