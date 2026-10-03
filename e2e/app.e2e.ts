import { expect, type Page, test } from "@playwright/test";

/** The step under the canvas, as a number. */
async function stepCount(page: Page): Promise<number> {
	const text = await page.getByText(/^Step: [\d,]+$/).textContent();
	return Number(text?.replace(/\D/g, ""));
}

/** Waits until the sim has stepped past `step`; the exact count depends on the machine. */
async function waitForStepPast(page: Page, step: number): Promise<void> {
	await expect.poll(() => stepCount(page), { timeout: 30_000 }).toBeGreaterThan(step);
}

let errors: string[] = [];

test.beforeEach(async ({ page }) => {
	errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	await page.goto("/");
	await expect(page.getByText("Step: 0")).toBeVisible();
});

test.afterEach(() => {
	expect(errors).toEqual([]);
});

test("loads the field and the sidebar, paused at step 0", async ({ page }) => {
	await expect(page.locator("canvas").first()).toBeVisible();
	await expect(page.getByText("Paused", { exact: true })).toBeVisible();
	for (const name of ["Population", "Top dots", "Walls", "Mutation"]) {
		await expect(page.getByRole("heading", { name })).toBeVisible();
	}
});

test("steps once with the Step button and with S", async ({ page }) => {
	await page.getByRole("button", { name: "Step" }).click();
	await expect(page.getByText("Step: 1", { exact: true })).toBeVisible();
	await page.keyboard.press("s");
	await expect(page.getByText("Step: 2", { exact: true })).toBeVisible();
});

test("runs and pauses with Space", async ({ page }) => {
	await page.keyboard.press("Space");
	await expect(page.getByText("Running", { exact: true })).toBeVisible();
	await waitForStepPast(page, 5);

	await page.keyboard.press("Space");
	await expect(page.getByText("Paused", { exact: true })).toBeVisible();
	const paused = await stepCount(page);
	await page.waitForTimeout(1000);
	expect(await stepCount(page)).toBe(paused);
});

test("follows a top dot and resets the run", async ({ page }) => {
	await page.keyboard.press("Space");
	// The board lists dots once one of them has caught prey or lived a step.
	const topDot = page.locator("ol").first().getByRole("button").first();
	await expect(topDot).toBeVisible({ timeout: 30_000 });
	await page.keyboard.press("Space");
	await expect(page.getByText("Paused", { exact: true })).toBeVisible();

	await topDot.click();
	const stopFollowing = page.getByRole("button", { name: "Stop following" });
	await expect(stopFollowing).toBeVisible();
	await expect(page.getByRole("dialog").getByText("Peak HP", { exact: true })).toBeVisible();
	await stopFollowing.click();
	await expect(stopFollowing).toBeHidden();

	await page.getByRole("button", { name: "Reset" }).click();
	await expect(page.getByRole("alertdialog", { name: "Start a new run?" })).toBeVisible();
	await page.getByRole("alertdialog").getByRole("button", { name: "Reset" }).click();
	await expect(page.getByText("Step: 0", { exact: true })).toBeVisible();
});
