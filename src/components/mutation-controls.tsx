import { memo, useState } from "react";
import { LabeledSlider } from "@/components/labeled-slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MutationParams } from "@/sim/types";

interface MutationControlsProps {
	mutation: MutationParams;
	onChange: (next: MutationParams) => void;
}

export const MutationControls = memo(function MutationControls({
	mutation,
	onChange,
}: MutationControlsProps) {
	// Kept as text so the field can be cleared while typing; only whole numbers ≥ 1 are applied.
	const [genesText, setGenesText] = useState(String(mutation.genes));

	function handleGenes(text: string) {
		setGenesText(text);
		const genes = Number(text);
		if (Number.isInteger(genes) && genes >= 1) onChange({ ...mutation, genes });
	}

	return (
		<div className="flex flex-col gap-4">
			<LabeledSlider
				id="mutation-chance"
				label="Chance per child"
				display={`${mutation.percent}%`}
				min={0}
				max={100}
				step={1}
				value={mutation.percent}
				onChange={(percent) => onChange({ ...mutation, percent })}
			/>

			<div className="flex items-center justify-between gap-3">
				<Label htmlFor="mutation-genes">Genes changed</Label>
				<Input
					id="mutation-genes"
					type="number"
					inputMode="numeric"
					min={1}
					step={1}
					value={genesText}
					onChange={(e) => handleGenes(e.target.value)}
					onBlur={() => setGenesText(String(mutation.genes))}
					className="h-8 w-16 text-right tabular-nums"
				/>
			</div>
		</div>
	);
});
