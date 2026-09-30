import { useCallback, useEffect, useRef, useState } from "react";
import {
	type Effect,
	playEffect,
	setVolume as setAudioVolume,
	startMusic,
	stopMusic,
	unlockAudio,
} from "@/lib/sound";
import { shortcutEvent, sliderKeys } from "@/lib/keyboard";
import { readFlag, readSetting, writeFlag, writeSetting } from "@/lib/storage";

const musicKey = "music";
const effectsKey = "sound-effects";
const volumeKey = "volume";

function storedVolume(): number {
	const value = readSetting(volumeKey);
	const parsed = value === null ? Number.NaN : Number(value);
	return parsed >= 0 && parsed <= 1 ? parsed : 1;
}

function closestTo(target: EventTarget | null, selector: string): Element | null {
	return target instanceof Element ? target.closest(selector) : null;
}

/**
 * The effect a click on this element plays: any button or menu item clicks, `data-sound="pop"`
 * pops, `data-sound="none"` stays silent. Other elements play nothing.
 */
function effectFor(target: EventTarget | null): Effect | null {
	const el = closestTo(target, 'button, [role^="menuitem"]');
	if (!el) return null;
	const sound = el.getAttribute("data-sound");
	if (sound === "none") return null;
	return sound === "pop" ? "pop" : "click";
}

const enabledSlider = '[data-slot="slider"]:not([data-disabled])';

/** Gap between drag ticks, so a fast drag across many steps doesn't pile up into a buzz. */
const dragTickMs = 50;

export interface Sound {
	music: boolean;
	effects: boolean;
	/** Master volume over music and effects, 0–1. */
	volume: number;
	setMusic: (on: boolean) => void;
	setEffects: (on: boolean) => void;
	setVolume: (next: number) => void;
	/** Plays an effect unless effects are off. */
	play: (effect: Effect) => void;
}

/**
 * Music (off by default), UI effects (on by default) and a master volume, remembered in
 * `localStorage`. Audio starts on the first pointer or key press, since browsers block it before
 * a gesture. Every button, menu item, slider and keyboard shortcut on the page plays its effect
 * through document listeners.
 */
export function useSound(): Sound {
	const [music, setMusicState] = useState(() => readFlag(musicKey, false));
	const [effects, setEffectsState] = useState(() => readFlag(effectsKey, true));
	const [volume, setVolumeState] = useState(storedVolume);
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

	useEffect(() => setAudioVolume(volume), [volume]);

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
		// A dragged slider ticks each time its value moves a step. The press (even when it jumps the
		// value to the pointer) and the release stay silent: ticks count only after the pointer moves.
		let moved = false;
		let lastTick = 0;
		const drag = new MutationObserver(() => {
			const now = performance.now();
			if (!moved || !effectsRef.current || now - lastTick < dragTickMs) return;
			lastTick = now;
			playEffect("click");
		});
		const onPointerDown = (e: PointerEvent) => {
			const slider = e.button === 0 ? closestTo(e.target, enabledSlider) : null;
			if (!slider) return;
			moved = false;
			drag.observe(slider, { subtree: true, attributeFilter: ["aria-valuenow"] });
		};
		const onPointerMove = () => {
			moved = true;
		};
		const onPointerUp = () => drag.disconnect();
		// A key step clicks once; a held key's repeats stay silent.
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.repeat || !sliderKeys.has(e.key) || !effectsRef.current) return;
			if (closestTo(e.target, '[role="slider"]')) playEffect("click");
		};
		const onShortcut = () => {
			if (effectsRef.current) playEffect("click");
		};
		const listeners = [
			["click", onClick],
			["pointerdown", onPointerDown],
			["pointermove", onPointerMove],
			["pointerup", onPointerUp],
			["pointercancel", onPointerUp],
			["keydown", onKeyDown],
			[shortcutEvent, onShortcut],
		] as const;
		for (const [type, listener] of listeners) {
			document.addEventListener(type, listener as EventListener, true);
		}
		return () => {
			drag.disconnect();
			for (const [type, listener] of listeners) {
				document.removeEventListener(type, listener as EventListener, true);
			}
		};
	}, []);

	const setMusic = useCallback((on: boolean) => {
		writeFlag(musicKey, on);
		setMusicState(on);
	}, []);

	const setEffects = useCallback((on: boolean) => {
		writeFlag(effectsKey, on);
		setEffectsState(on);
		// The menu item stays silent (it would click on the way off); confirm the way on instead.
		if (on) playEffect("click");
	}, []);

	const setVolume = useCallback((next: number) => {
		writeSetting(volumeKey, String(next));
		setVolumeState(next);
	}, []);

	const play = useCallback((effect: Effect) => {
		if (effectsRef.current) playEffect(effect);
	}, []);

	return { music, effects, volume, setMusic, setEffects, setVolume, play };
}
