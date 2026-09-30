import posthog from "posthog-js";

const apiKey = import.meta.env.VITE_POSTHOG_KEY;
const apiHost = import.meta.env.VITE_POSTHOG_HOST;

export const isPostHogEnabled = Boolean(apiKey && apiHost);

if (!apiKey) {
	if (import.meta.env.DEV) {
		throw new Error(
			"VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured",
		);
	}
} else if (!apiHost) {
	if (import.meta.env.DEV) {
		throw new Error(
			"VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured",
		);
	}
} else {
	posthog.init(apiKey, {
		api_host: apiHost,
		defaults: "2026-05-30",
		logs: {
			serviceName: "neuroparticles-plus-web",
			environment: import.meta.env.MODE,
		},
		capture_exceptions: {
			capture_unhandled_errors: true,
			capture_unhandled_rejections: true,
			capture_console_errors: false,
		},
	});
}

export { posthog };
