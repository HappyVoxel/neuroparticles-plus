#!/usr/bin/env bash
# Re-encodes the source sounds into small Opus/WebM files under src/assets/.
# Opus loops without gaps once decoded by Web Audio; MP3 and AAC pad the start and click on every loop.
# Usage: scripts/encode-audio.sh <ui-sounds-dir> <music-dir>
set -euo pipefail

ui_dir=${1:?ui sounds dir (400 Sounds Pack/UI)}
music_dir=${2:?music loop dir (music-loop-bundle-2026-q2)}
out=$(cd "$(dirname "$0")/.." && pwd)/src/assets

mkdir -p "$out/sound" "$out/music"

encode() { ffmpeg -v error -y -i "$1" -vn -map_metadata -1 -c:a libopus -b:a "$2" "$3"; }

encode "$ui_dir/click_double_on.wav" 64k "$out/sound/click.webm"
encode "$ui_dir/pop_3.wav" 64k "$out/sound/pop.webm"

# "Week 13 - Primordial Soup BASE.ogg" -> primordial-soup-base.webm
for src in "$music_dir"/*.ogg; do
	name=$(basename "$src" .ogg | sed -E 's/^Week [0-9.]+ - //' | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
	encode "$src" 128k "$out/music/$name.webm"
done
