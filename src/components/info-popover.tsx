import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InfoPopoverProps {
	/** What the explanation is about, for screen readers: "About {topic}". */
	topic: string;
	children: ReactNode;
}

/** An info icon that opens a short explanation on click; sits at the end of a section title. */
export function InfoPopover({ topic, children }: InfoPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon-xs"
					className="text-muted-foreground"
					aria-label={`About ${topic}`}
				>
					<InfoIcon />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 text-xs">
				{children}
			</PopoverContent>
		</Popover>
	);
}
