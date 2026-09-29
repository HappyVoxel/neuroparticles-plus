import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { MutationParams } from "@/sim/types";

interface MutationControlsProps {
	mutation: MutationParams;
	onChange: (next: MutationParams) => void;
}

export function MutationControls({ mutation, onChange }: MutationControlsProps) {
	// Kept as text so the field can be cleared while typing; only whole numbers ≥ 1 are applied.
	const [genesText, setGenesText] = useState(String(mutation.genes));

	function handleGenes(text: string) {
		setGenesText(text);
		const genes = Number(text);
		if (Number.isInteger(genes) && genes >= 1) onChange({ ...mutation, genes });
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<div className="flex items-baseline justify-between gap-3">
					<Label htmlFor="mutation-chance">Chance per child</Label>
					<span className="text-sm tabular-nums">{mutation.percent}%</span>
				</div>
				<Slider
					id="mutation-chance"
					min={0}
					max={100}
					step={1}
					value={[mutation.percent]}
					onValueChange={([percent]) => onChange({ ...mutation, percent })}
					aria-label="Chance per child"
				/>
			</div>

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

			<p className="text-xs text-muted-foreground">
				How often a newborn gets random weights, and how many.
			</p>
		</div>
	);
}
