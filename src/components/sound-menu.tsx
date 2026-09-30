import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { type KeyboardEvent, memo } from "react";
import { LabeledSlider } from "@/components/labeled-slider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SoundMenuProps {
	music: boolean;
	effects: boolean;
	volume: number;
	onMusicChange: (on: boolean) => void;
	onEffectsChange: (on: boolean) => void;
	onVolumeChange: (next: number) => void;
	/**
	 * Plays the open sound. Radix opens the menu on pointerdown and blocks the trigger's click, so
	 * the page-wide click sound never fires for it.
	 */
	onOpen: () => void;
}

// Keeps the menu open after a toggle, so both can be set in one visit.
const stayOpen = (e: Event) => e.preventDefault();

const sliderKeys = new Set([
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Home",
	"End",
	"PageUp",
	"PageDown",
]);
// The menu moves focus between items on arrow keys; keep them on the slider instead.
const keepSliderKeys = (e: KeyboardEvent) => {
	if (sliderKeys.has(e.key)) e.stopPropagation();
};

export const SoundMenu = memo(function SoundMenu({
	music,
	effects,
	volume,
	onMusicChange,
	onEffectsChange,
	onVolumeChange,
	onOpen,
}: SoundMenuProps) {
	return (
		<DropdownMenu onOpenChange={(open) => open && onOpen()}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" aria-label="Sound" data-sound="none">
							{volume > 0 && (music || effects) ? <Volume2Icon /> : <VolumeXIcon />}
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>Sound</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end">
				<fieldset className="px-3 py-2" onKeyDown={keepSliderKeys}>
					<LabeledSlider
						id="volume"
						label="Volume"
						display={`${Math.round(volume * 100)}%`}
						min={0}
						max={1}
						step={0.05}
						value={volume}
						onChange={onVolumeChange}
					/>
				</fieldset>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem
					checked={music}
					onCheckedChange={onMusicChange}
					onSelect={stayOpen}
				>
					Music
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={effects}
					onCheckedChange={onEffectsChange}
					onSelect={stayOpen}
					data-sound="none"
				>
					Sound effects
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
});
