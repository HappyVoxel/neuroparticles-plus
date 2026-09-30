import { PauseIcon, PlayIcon, RotateCcwIcon, ShuffleIcon, StepForwardIcon } from "lucide-react";
import { memo, type ReactNode } from "react";
import { LabeledSlider } from "@/components/labeled-slider";
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
import { useRunShortcut } from "@/hooks/use-run-shortcut";
import { useShortcut } from "@/hooks/use-shortcut";
import type { RunStatus } from "@/hooks/use-simulation";
import { maxStepsPerSecond, minStepsPerSecond } from "@/sim/config";

interface ConfirmButtonProps {
	icon: ReactNode;
	/** Names the button, its tooltip and the dialog's confirm action. */
	label: string;
	title: string;
	description: string;
	onConfirm: () => void;
	disabled?: boolean;
}

/** An icon button that asks before it acts. */
function ConfirmButton({
	icon,
	label,
	title,
	description,
	onConfirm,
	disabled,
}: ConfirmButtonProps) {
	return (
		<AlertDialog>
			<Tooltip>
				<TooltipTrigger asChild>
					<AlertDialogTrigger asChild>
						<Button variant="outline" size="icon-sm" disabled={disabled} aria-label={label}>
							{icon}
						</Button>
					</AlertDialogTrigger>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						{label}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

interface RunControlsProps {
	status: RunStatus;
	stepsPerSecond: number;
	onSpeedChange: (next: number) => void;
	onRun: () => void;
	onPause: () => void;
	onStep: () => void;
	onRandomize: () => void;
	onReset: () => void;
}

export const RunControls = memo(function RunControls({
	status,
	stepsPerSecond,
	onSpeedChange,
	onRun,
	onPause,
	onStep,
	onRandomize,
	onReset,
}: RunControlsProps) {
	const running = status === "running";
	const stopped = status === "stopped";
	const toggle = running ? onPause : onRun;
	const stepDisabled = running || stopped;
	// Space and S press these buttons, off whenever the button is disabled.
	useRunShortcut(toggle, !stopped);
	useShortcut("s", onStep, !stepDisabled);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex gap-2">
				<Button size="sm" className="flex-1" onClick={toggle} disabled={stopped}>
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
							disabled={stepDisabled}
						>
							<StepForwardIcon data-icon="inline-start" />
							Step
						</Button>
					</TooltipTrigger>
					<TooltipContent>Advance one step</TooltipContent>
				</Tooltip>

				<ConfirmButton
					icon={<ShuffleIcon />}
					label="Randomize brains"
					title="Randomize every brain?"
					description="All evolved behavior is lost. Dots keep their position, health and age."
					onConfirm={onRandomize}
					disabled={stopped}
				/>
				<ConfirmButton
					icon={<RotateCcwIcon />}
					label="Reset"
					title="Start a new run?"
					description="All dots and the step count are replaced. Walls, mutation and speed stay as set."
					onConfirm={onReset}
				/>
			</div>

			<LabeledSlider
				id="speed"
				label="Speed"
				display={`${stepsPerSecond} steps/s`}
				min={minStepsPerSecond}
				max={maxStepsPerSecond}
				step={minStepsPerSecond}
				value={stepsPerSecond}
				onChange={onSpeedChange}
			/>
		</div>
	);
});
