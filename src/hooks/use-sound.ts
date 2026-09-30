import { useCallback, useEffect, useRef, useState } from "react";
import {
	type Effect,
	playEffect,
	setVolume as setAudioVolume,
	startMusic,
	stopMusic,
	unlockAudio,
} from "@/lib/sound";
import { readSetting, writeSetting } from "@/lib/storage";

const musicKey = "music";
const effectsKey = "sound-effects";
const volumeKey = "volume";

function storedOn(key: string, fallback: boolean): boolean {
	const value = readSetting(key);
	return value === "on" || value === "off" ? value === "on" : fallback;
}

function storedVolume(): number {
	const value = readSetting(volumeKey);
	const parsed = value === null ? Number.NaN : Number(value);
	return parsed >= 0 && parsed <= 1 ? parsed : 1;
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
 * a gesture. Every button and menu item on the page plays its effect through one document click
 * listener.
 */
export function useSound(): Sound {
	const [music, setMusicState] = useState(() => storedOn(musicKey, false));
	const [effects, setEffectsState] = useState(() => storedOn(effectsKey, true));
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
		document.addEventListener("click", onClick, true);
		return () => document.removeEventListener("click", onClick, true);
	}, []);

	const setMusic = useCallback((on: boolean) => {
		writeSetting(musicKey, on ? "on" : "off");
		setMusicState(on);
	}, []);

	const setEffects = useCallback((on: boolean) => {
		writeSetting(effectsKey, on ? "on" : "off");
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
