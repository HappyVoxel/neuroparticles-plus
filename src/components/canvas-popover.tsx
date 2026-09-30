import { XIcon } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
} from "@/components/ui/popover";
import { percent } from "@/lib/format";
import { gridHeight, gridWidth } from "@/sim/config";

/** A box of cells as percent of the canvas, for the style of a popover's anchor. */
export function cellBox(x: number, y: number, width: number, height: number): CSSProperties {
	return {
		left: percent(x, gridWidth),
		top: percent(y, gridHeight),
		width: percent(width, gridWidth),
		height: percent(height, gridHeight),
	};
}

interface CanvasPopoverProps extends Omit<ComponentProps<typeof PopoverContent>, "title"> {
	title: ReactNode;
	titleClassName?: string;
	/** The line under the title. */
	description: ReactNode;
	/** Names the X button. */
	closeLabel: string;
	onClose: () => void;
}

/**
 * A popover's content beside the canvas: a title, a line under it and an X button, then
 * `children`. It takes no focus when it opens and stays open on clicks elsewhere, so the rest of
 * the page keeps working. Other props (`side`, `aria-label`, ...) go to `PopoverContent`.
 */
export function CanvasPopover({
	title,
	titleClassName,
	description,
	closeLabel,
	onClose,
	children,
	...content
}: CanvasPopoverProps) {
	return (
		<PopoverContent
			align="start"
			sideOffset={8}
			className="w-72 gap-3 text-xs"
			onOpenAutoFocus={(e) => e.preventDefault()}
			onInteractOutside={(e) => e.preventDefault()}
			{...content}
		>
			<div className="flex items-start justify-between gap-3">
				<PopoverHeader>
					<PopoverTitle className={titleClassName}>{title}</PopoverTitle>
					<PopoverDescription className="text-xs tabular-nums">{description}</PopoverDescription>
				</PopoverHeader>
				<Button
					variant="ghost"
					size="icon-xs"
					className="-mt-1.5 -mr-1.5 text-muted-foreground"
					aria-label={closeLabel}
					onClick={onClose}
				>
					<XIcon />
				</Button>
			</div>
			{children}
		</PopoverContent>
	);
}
