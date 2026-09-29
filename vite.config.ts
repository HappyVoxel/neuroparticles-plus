import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Relative asset paths so the build works from any subfolder, e.g. /neuroparticles/.
export default defineConfig({
	base: "./",
	plugins: [tailwindcss()],
});
