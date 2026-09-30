import { isPostHogEnabled, posthog } from "@/lib/posthog";

/**
 * The sole logger for simulation lifecycle records exported to PostHog Logs.
 * It intentionally does not forward the application's console or other loggers.
 */
export const simulationLogger = {
	info(message: string, attributes: Record<string, number>): void {
		if (isPostHogEnabled) posthog.logger.info(message, attributes);
	},
};
