import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label}>
					{theme === "dark" ? <SunIcon /> : <MoonIcon />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
