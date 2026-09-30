import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SoundMenuProps {
	music: boolean;
	effects: boolean;
	onMusicChange: (on: boolean) => void;
	onEffectsChange: (on: boolean) => void;
	/**
	 * Plays the open sound. Radix opens the menu on pointerdown and blocks the trigger's click, so
	 * the page-wide click sound never fires for it.
	 */
	onOpen: () => void;
}

// Keeps the menu open after a toggle, so both can be set in one visit.
const stayOpen = (e: Event) => e.preventDefault();

export const SoundMenu = memo(function SoundMenu({
	music,
	effects,
	onMusicChange,
	onEffectsChange,
	onOpen,
}: SoundMenuProps) {
	return (
		<DropdownMenu onOpenChange={(open) => open && onOpen()}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" aria-label="Sound" data-sound="none">
							{music || effects ? <Volume2Icon /> : <VolumeXIcon />}
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>Sound</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end">
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
