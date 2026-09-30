import clickUrl from "@/assets/sound/click.webm";
import popUrl from "@/assets/sound/pop.webm";

/**
 * Web Audio playback for UI effects and background music. Files come from
 * `scripts/encode-audio.sh` (Opus in WebM). Music loops through `AudioBufferSourceNode.loop`,
 * which repeats the decoded samples with no gap; `<audio loop>` leaves a gap in some browsers.
 */

const effectUrls = { click: clickUrl, pop: popUrl } as const;
export type Effect = keyof typeof effectUrls;

// Only URLs here; a track is fetched when it is about to play.
const musicUrls: readonly string[] = Object.values(
	import.meta.glob<string>("../assets/music/*.webm", {
		eager: true,
		query: "?url",
		import: "default",
	}),
);

const effectVolume = 0.6;
const musicVolume = 0.3;
/** How long one loop repeats before the next track fades in. */
const trackSeconds = 120;
const crossfadeSeconds = 3;
const stopFadeSeconds = 0.5;

let context: AudioContext | null = null;
/** Master volume, 0–1, set before or after the context exists. */
let volume = 1;
let masterBus: GainNode | null = null;
let effectsBus: GainNode | null = null;
let musicBus: GainNode | null = null;
const effectBuffers = new Map<Effect, Promise<AudioBuffer>>();

interface Playing {
	source: AudioBufferSourceNode;
	gain: GainNode;
	track: number;
}
let playing: Playing | null = null;
let nextTimer: ReturnType<typeof setTimeout> | undefined;
/** Bumped by every start and stop, so a track still loading from an older start is dropped. */
let generation = 0;

/** A random track index other than `current` (when there is another to pick). */
export function nextTrack(
	current: number,
	count: number,
	random: () => number = Math.random,
): number {
	if (current < 0 || count <= 1) return Math.floor(random() * count);
	const pick = Math.floor(random() * (count - 1));
	return pick >= current ? pick + 1 : pick;
}

async function decode(ctx: AudioContext, url: string): Promise<AudioBuffer> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`fetch ${url}: ${response.status}`);
	return ctx.decodeAudioData(await response.arrayBuffer());
}

/** Ears hear gain roughly on a log scale; squaring makes the slider's middle sound like the middle. */
const loudness = (v: number): number => v * v;

/** Sets the master volume (0–1) over both music and effects. */
export function setVolume(next: number): void {
	volume = Math.min(1, Math.max(0, next));
	// A short glide instead of a jump, so dragging the slider doesn't crackle.
	if (context && masterBus)
		masterBus.gain.setTargetAtTime(loudness(volume), context.currentTime, 0.02);
}

/**
 * Creates or resumes the audio context. Browsers keep audio silent until a user gesture, so call
 * this from one (pointerdown, keydown). Also starts decoding the effects so the first click plays.
 */
export function unlockAudio(): void {
	if (!context) {
		context = new AudioContext();
		masterBus = new GainNode(context, { gain: loudness(volume) });
		masterBus.connect(context.destination);
		effectsBus = new GainNode(context, { gain: effectVolume });
		effectsBus.connect(masterBus);
		musicBus = new GainNode(context, { gain: musicVolume });
		musicBus.connect(masterBus);
		for (const [effect, url] of Object.entries(effectUrls)) {
			const buffer = decode(context, url);
			// A failed decode leaves that effect silent; it must not surface as an unhandled rejection.
			buffer.catch(() => {});
			effectBuffers.set(effect as Effect, buffer);
		}
	}
	if (context.state === "suspended") context.resume().catch(() => {});
}

export function playEffect(effect: Effect): void {
	const ctx = context;
	const bus = effectsBus;
	const buffer = effectBuffers.get(effect);
	if (!ctx || !bus || !buffer) return;
	buffer
		.then((b) => {
			const source = new AudioBufferSourceNode(ctx, { buffer: b });
			source.connect(bus);
			source.start();
		})
		.catch(() => {});
}

function fadeOutAndStop(p: Playing, seconds: number): void {
	const now = p.gain.context.currentTime;
	p.gain.gain.cancelScheduledValues(now);
	p.gain.gain.setValueAtTime(p.gain.gain.value, now);
	p.gain.gain.linearRampToValueAtTime(0, now + seconds);
	p.source.stop(now + seconds);
}

async function playTrack(track: number, gen: number): Promise<void> {
	const ctx = context;
	const bus = musicBus;
	if (!ctx || !bus) return;
	let buffer: AudioBuffer;
	try {
		buffer = await decode(ctx, musicUrls[track]);
	} catch {
		// Skip a track that fails to load; the one playing keeps looping until the next switch.
		if (gen === generation) scheduleNext(track, gen);
		return;
	}
	if (gen !== generation) return;

	const gain = new GainNode(ctx, { gain: 0 });
	gain.connect(bus);
	const source = new AudioBufferSourceNode(ctx, { buffer, loop: true });
	source.connect(gain);
	source.onended = () => gain.disconnect();
	const now = ctx.currentTime;
	gain.gain.linearRampToValueAtTime(1, now + crossfadeSeconds);
	source.start(now);

	if (playing) fadeOutAndStop(playing, crossfadeSeconds);
	playing = { source, gain, track };
	scheduleNext(track, gen);
}

function scheduleNext(track: number, gen: number): void {
	clearTimeout(nextTimer);
	nextTimer = setTimeout(
		() => playTrack(nextTrack(track, musicUrls.length), gen),
		trackSeconds * 1000,
	);
}

/** Starts the shuffled music loop. Call after `unlockAudio`; does nothing if already playing. */
export function startMusic(): void {
	if (!context || playing || musicUrls.length === 0) return;
	generation += 1;
	playTrack(nextTrack(-1, musicUrls.length), generation);
}

export function stopMusic(): void {
	generation += 1;
	clearTimeout(nextTimer);
	if (playing) fadeOutAndStop(playing, stopFadeSeconds);
	playing = null;
}
