import { PauseIcon, PlayIcon, ShuffleIcon, StepForwardIcon } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RunStatus } from "@/hooks/use-simulation";

interface RunControlsProps {
	status: RunStatus;
	onRun: () => void;
	onPause: () => void;
	onStep: () => void;
	onRandomize: () => void;
}

export function RunControls({ status, onRun, onPause, onStep, onRandomize }: RunControlsProps) {
	const running = status === "running";
	const stopped = status === "stopped";

	return (
		<div className="flex gap-2">
			<Button size="sm" className="flex-1" onClick={running ? onPause : onRun} disabled={stopped}>
				{running ? <PauseIcon data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}
				{running ? "Pause" : "Run"}
			</Button>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={onStep}
						disabled={running || stopped}
					>
						<StepForwardIcon data-icon="inline-start" />
						Step
					</Button>
				</TooltipTrigger>
				<TooltipContent>Advance one step</TooltipContent>
			</Tooltip>

			<AlertDialog>
				<Tooltip>
					<TooltipTrigger asChild>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								size="icon-sm"
								disabled={stopped}
								aria-label="Randomize brains"
							>
								<ShuffleIcon />
							</Button>
						</AlertDialogTrigger>
					</TooltipTrigger>
					<TooltipContent>Randomize brains</TooltipContent>
				</Tooltip>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Randomize every brain?</AlertDialogTitle>
						<AlertDialogDescription>
							All evolved behavior is lost. Dots keep their position, health and age.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={onRandomize}>
							Randomize brains
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
