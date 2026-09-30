import type { ReactNode } from "react";
import { InfoPopover } from "@/components/info-popover";

interface SidebarSectionProps {
	title: string;
	/** The explanation behind the info icon at the end of the title. */
	info: ReactNode;
	/** A control in the title row, before the info icon (a filter, say). */
	action?: ReactNode;
	children: ReactNode;
}

/** A titled sidebar section with its explanation behind an info icon. */
export function SidebarSection({ title, info, action, children }: SidebarSectionProps) {
	const topic = title.toLowerCase();
	const headingId = `${topic}-heading`;

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 id={headingId} className="text-sm font-medium">
					{title}
				</h2>
				<div className="flex items-center gap-1">
					{action}
					<InfoPopover topic={topic}>{info}</InfoPopover>
				</div>
			</div>
			{children}
		</section>
	);
}
