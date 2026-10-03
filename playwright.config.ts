import { defineConfig, devices } from "@playwright/test";

const port = 4173;

// End-to-end checks of the critical paths against the production build. CI runs them in
// .woodpecker/test.yaml on the Playwright image, whose version must match @playwright/test.
export default defineConfig({
	testDir: "e2e",
	testMatch: "*.e2e.ts",
	// A headless CI container runs the sim slowly.
	timeout: 60_000,
	expect: { timeout: 15_000 },
	forbidOnly: Boolean(process.env.CI),
	reporter: "list",
	use: {
		baseURL: `http://localhost:${port}`,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			// 900px tall reaches the desktop layout (800px and up).
			use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
		},
	],
	webServer: {
		command: `pnpm build && pnpm preview --port ${port} --strictPort`,
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		// Blank the PostHog key so test runs never send analytics, even with a local .env.
		env: { VITE_POSTHOG_KEY: "", VITE_POSTHOG_HOST: "" },
	},
});
