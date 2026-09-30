import { memo } from "react";
import { LabeledSlider } from "@/components/labeled-slider";
import { formatCount } from "@/lib/format";
import { maxWallPenalty, minWallPenalty, wallPenaltyStep } from "@/sim/config";

interface WallControlsProps {
	wallPenalty: number;
	onChange: (next: number) => void;
}

export const WallControls = memo(function WallControls({
	wallPenalty,
	onChange,
}: WallControlsProps) {
	return (
		<LabeledSlider
			id="wall-penalty"
			label="Bump cost"
			display={`${formatCount(wallPenalty)} HP`}
			min={minWallPenalty}
			max={maxWallPenalty}
			step={wallPenaltyStep}
			value={wallPenalty}
			onChange={onChange}
		/>
	);
});
