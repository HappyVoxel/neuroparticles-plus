import { useCallback, useState } from "react";
import { useShortcut } from "@/hooks/use-shortcut";

/** Whether the canvas loupe is on. Z toggles it and Escape turns it off. */
export function useLoupe(): boolean {
	const [on, setOn] = useState(false);
	const toggle = useCallback(() => setOn((current) => !current), []);
	const turnOff = useCallback(() => setOn(false), []);
	useShortcut("z", toggle);
	useShortcut("Escape", turnOff, on);
	return on;
}
