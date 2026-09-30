import { useEffect, useState } from "react";

/** True while focus sits in a field that takes typing, where Z is a letter, not a shortcut. */
function isTyping(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/** Whether the canvas loupe is on. Z toggles it and Escape turns it off. */
export function useLoupe(): boolean {
	const [on, setOn] = useState(false);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			// Cmd+Z / Ctrl+Z is undo, not the loupe.
			if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTyping(e.target)) return;
			if (e.key === "z" || e.key === "Z") setOn((current) => !current);
			else if (e.key === "Escape") setOn(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	return on;
}
