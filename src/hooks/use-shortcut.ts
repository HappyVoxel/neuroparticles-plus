import { useEffect } from "react";
import { isShortcut, shortcutEvent } from "@/lib/keyboard";

/**
 * Runs `onPress` when `key` is pressed anywhere on the page (see `isShortcut`), then sends
 * `shortcutEvent` so it clicks like a button. A held key acts once. While `enabled` is false the
 * key does nothing and stays silent, like a disabled button.
 */
export function useShortcut(key: string, onPress: () => void, enabled = true): void {
	useEffect(() => {
		if (!enabled) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.repeat || !isShortcut(e, key)) return;
			onPress();
			document.dispatchEvent(new Event(shortcutEvent));
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [key, onPress, enabled]);
}
