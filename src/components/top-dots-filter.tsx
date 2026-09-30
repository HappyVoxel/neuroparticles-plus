import { ListFilterIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SpeciesStats } from "@/hooks/use-simulation";
import type { TopDotsFilter } from "@/sim/types";

interface TopDotsFilterMenuProps {
	filter: TopDotsFilter;
	/** Name and color of each species, by index. */
	species: readonly SpeciesStats[];
	onChange: (next: TopDotsFilter) => void;
	/** Plays the open sound; Radix blocks the trigger's click (see `SoundMenu`). */
	onOpen: () => void;
}

// Keeps the menu open after a toggle, so several can be set in one visit.
const stayOpen = (e: Event) => e.preventDefault();

/** A filter icon for the top-dots title: show or hide the dead and each species. */
export const TopDotsFilterMenu = memo(function TopDotsFilterMenu({
	filter,
	species,
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
				{species.map((s, i) => (
					<DropdownMenuCheckboxItem
						key={s.id}
						checked={filter.species[i]}
						onCheckedChange={(shown) =>
							onChange({ ...filter, species: filter.species.map((v, k) => (k === i ? shown : v)) })
						}
						onSelect={stayOpen}
					>
						<span aria-hidden className="size-2 shrink-0" style={{ backgroundColor: s.color }} />
						{s.name}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
});
