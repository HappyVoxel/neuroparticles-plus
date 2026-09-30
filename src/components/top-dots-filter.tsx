import { ListFilterIcon } from "lucide-react";
import { memo } from "react";
import { SpeciesSwatch } from "@/components/species-swatch";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { stayOpen } from "@/lib/menu";
import { speciesDisplay } from "@/lib/species";
import type { TopDotsFilter } from "@/sim/types";

interface TopDotsFilterMenuProps {
	filter: TopDotsFilter;
	onChange: (next: TopDotsFilter) => void;
	/** Plays the open sound; Radix blocks the trigger's click (see `SoundMenu`). */
	onOpen: () => void;
}

/** A filter icon for the top-dots title: show or hide the dead and each species. */
export const TopDotsFilterMenu = memo(function TopDotsFilterMenu({
	filter,
	onChange,
	onOpen,
}: TopDotsFilterMenuProps) {
	const filtered = !filter.dead || filter.species.some((shown) => !shown);
	const label = filtered ? "Filter top dots (some hidden)" : "Filter top dots";

	return (
		<DropdownMenu onOpenChange={(open) => open && onOpen()}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							// Pressed-looking while anything is hidden, so a filtered list isn't read as the whole.
							variant={filtered ? "secondary" : "ghost"}
							size="icon-xs"
							className={filtered ? undefined : "text-muted-foreground"}
							aria-label={label}
							data-sound="none"
						>
							<ListFilterIcon />
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end">
				<DropdownMenuCheckboxItem
					checked={filter.dead}
					onCheckedChange={(dead) => onChange({ ...filter, dead })}
					onSelect={stayOpen}
				>
					Dead dots
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				{speciesDisplay.map((s, i) => (
					<DropdownMenuCheckboxItem
						key={s.name}
						checked={filter.species[i]}
						onCheckedChange={(shown) =>
							onChange({ ...filter, species: filter.species.map((v, k) => (k === i ? shown : v)) })
						}
						onSelect={stayOpen}
					>
						<SpeciesSwatch species={i} />
						{s.name}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
});
