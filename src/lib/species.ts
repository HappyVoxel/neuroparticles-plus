import { oklchCss, shadeAt } from "@/sim/color";
import { speciesDefs } from "@/sim/config";

/** Each species' name and UI color (the middle of its shades), by its index in `Sim.species`. */
export const speciesDisplay: readonly { name: string; color: string }[] = speciesDefs.map(
	({ name, shades }) => ({ name, color: oklchCss(shadeAt(shades, 0.5)) }),
);
