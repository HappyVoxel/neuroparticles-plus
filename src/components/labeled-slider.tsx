import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface LabeledSliderProps {
	id: string;
	label: string;
	/** The current value as shown beside the label, with its unit. */
	display: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: (next: number) => void;
}

/** A slider with its label on the left and its current value on the right above it. */
export function LabeledSlider({
	id,
	label,
	display,
	min,
	max,
	step,
	value,
	onChange,
}: LabeledSliderProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-baseline justify-between gap-3">
				<Label htmlFor={id}>{label}</Label>
				<span className="text-sm tabular-nums">{display}</span>
			</div>
			<Slider
				id={id}
				min={min}
				max={max}
				step={step}
				value={[value]}
				onValueChange={([next]) => onChange(next)}
				aria-label={label}
			/>
		</div>
	);
}
