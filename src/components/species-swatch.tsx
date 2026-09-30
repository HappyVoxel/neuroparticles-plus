import { speciesDisplay } from "@/lib/species";

interface SpeciesSwatchProps {
	/** Index in `Sim.species`. */
	species: number;
}

/** A small square in a species' color, beside its name. */
export function SpeciesSwatch({ species }: SpeciesSwatchProps) {
	return (
		<span
			aria-hidden
			className="size-2 shrink-0"
			style={{ backgroundColor: speciesDisplay[species].color }}
		/>
	);
}
