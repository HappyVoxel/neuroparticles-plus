import { useCallback, useEffect, useRef, useState } from "react";
import { type Effect, playEffect, startMusic, stopMusic, unlockAudio } from "@/lib/sound";

const musicKey = "music";
const effectsKey = "sound-effects";

function stored(key: string, fallback: boolean): boolean {
	try {
		const value = localStorage.getItem(key);
		if (value === "on" || value === "off") return value === "on";
	} catch {
		// Storage blocked (private window, sandbox): use the default.
	}
	return fallback;
}

function save(key: string, on: boolean): void {
	try {
		localStorage.setItem(key, on ? "on" : "off");
	} catch {
		// Not saved; the setting still holds for this visit.
	}
}

/**
 * The effect a click on this element plays: any button or menu item clicks, `data-sound="pop"`
 * pops, `data-sound="none"` stays silent. Other elements play nothing.
 */
function effectFor(target: EventTarget | null): Effect | null {
	if (!(target instanceof Element)) return null;
	const el = target.closest('button, [role^="menuitem"]');
	if (!el) return null;
	const sound = el.getAttribute("data-sound");
	if (sound === "none") return null;
	return sound === "pop" ? "pop" : "click";
}

export interface Sound {
	music: boolean;
	effects: boolean;
	setMusic: (on: boolean) => void;
	setEffects: (on: boolean) => void;
	/** Plays an effect unless effects are off. */
	play: (effect: Effect) => void;
}

/**
 * Music (off by default) and UI effects (on by default), remembered in `localStorage`. Audio
 * starts on the first pointer or key press, since browsers block it before a gesture. Every
 * button and menu item on the page plays its effect through one document click listener.
 */
export function useSound(): Sound {
	const [music, setMusicState] = useState(() => stored(musicKey, false));
	const [effects, setEffectsState] = useState(() => stored(effectsKey, true));
	const [unlocked, setUnlocked] = useState(false);
	const effectsRef = useRef(effects);
	effectsRef.current = effects;

	useEffect(() => {
		const unlock = () => {
			unlockAudio();
			setUnlocked(true);
		};
		window.addEventListener("pointerdown", unlock, { capture: true, once: true });
		window.addEventListener("keydown", unlock, { capture: true, once: true });
		return () => {
			window.removeEventListener("pointerdown", unlock, { capture: true });
			window.removeEventListener("keydown", unlock, { capture: true });
		};
	}, []);

	useEffect(() => {
		if (!music || !unlocked) return;
		startMusic();
		return stopMusic;
	}, [music, unlocked]);

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const effect = effectFor(e.target);
			if (effect && effectsRef.current) playEffect(effect);
		};
		document.addEventListener("click", onClick, true);
		return () => document.removeEventListener("click", onClick, true);
	}, []);

	const setMusic = useCallback((on: boolean) => {
		save(musicKey, on);
		setMusicState(on);
	}, []);

	const setEffects = useCallback((on: boolean) => {
		save(effectsKey, on);
		setEffectsState(on);
		// The menu item stays silent (it would click on the way off); confirm the way on instead.
		if (on) playEffect("click");
	}, []);

	const play = useCallback((effect: Effect) => {
		if (effectsRef.current) playEffect(effect);
	}, []);

	return { music, effects, setMusic, setEffects, play };
}
