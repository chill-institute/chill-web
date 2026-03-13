import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	use: {
		baseURL: "http://localhost:3000",
		browserName: "chromium",
	},
	webServer: {
		command: process.env.CI ? "bun run preview" : "bun run build && bun run preview",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
});
