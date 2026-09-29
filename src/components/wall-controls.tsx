import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { maxWallPenalty, wallPenaltyStep } from "@/sim/config";
import { formatCount } from "@/lib/format";

interface WallControlsProps {
	wallPenalty: number;
	onChange: (next: number) => void;
}

export function WallControls({ wallPenalty, onChange }: WallControlsProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-baseline justify-between gap-3">
				<Label htmlFor="wall-penalty">Bump cost</Label>
				<span className="text-sm tabular-nums">{formatCount(wallPenalty)} HP</span>
			</div>
			<Slider
				id="wall-penalty"
				min={0}
				max={maxWallPenalty}
				step={wallPenaltyStep}
				value={[wallPenalty]}
				onValueChange={([next]) => onChange(next)}
				aria-label="Bump cost"
			/>
		</div>
	);
}
