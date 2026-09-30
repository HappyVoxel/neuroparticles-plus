/** True while focus sits in a field that takes typing, where a key is text, not a shortcut. */
function isTyping(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/** Keys a focused slider uses to change its value. */
export const sliderKeys: ReadonlySet<string> = new Set([
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Home",
	"End",
	"PageUp",
	"PageDown",
]);

/** The `document` event a shortcut sends after it acts; `use-sound` clicks on it. */
export const shortcutEvent = "shortcut";

/**
 * Whether this key press is the shortcut `key` (an `e.key` value, any case): no Cmd, Ctrl or Alt,
 * not typed into a field, not inside a confirm dialog.
 */
export function isShortcut(e: KeyboardEvent, key: string): boolean {
	if (e.key.toLowerCase() !== key.toLowerCase()) return false;
	if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return false;
	return !(e.target instanceof Element && e.target.closest('[role="alertdialog"]'));
}
