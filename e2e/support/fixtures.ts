import { test as base, type Page, type Route } from "@playwright/test";

import { playwrightPort } from "./port";

const port = playwrightPort(58300);

const AUTH_STORAGE_STATE = {
  cookies: [],
  origins: [
    {
      origin: `http://localhost:${port}`,
      localStorage: [{ name: "chill.auth_token", value: "test-token" }],
    },
  ],
};

type MockRpcMethods = Record<string, unknown>;

type MockRpc = (methods: MockRpcMethods) => Promise<void>;

const SERVICE_PATTERN = /chill\.v4\.UserService\//;

function methodFromUrl(url: string): string | undefined {
  const match = url.match(/chill\.v4\.UserService\/(\w+)/);
  return match?.[1];
}

async function createMockRpc(page: Page): Promise<MockRpc> {
  return async (methods: MockRpcMethods) => {
    await page.route(SERVICE_PATTERN, async (route: Route) => {
      const method = methodFromUrl(route.request().url());
      if (method && method in methods) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(methods[method]),
        });
        return;
      }
      // Return empty proto JSON for any unmocked method to avoid
      // hitting the real server and triggering auth redirects.
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });
  };
}

async function stubBackendHealth(page: Page) {
  await page.route("**/healthz", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });
}

export const test = base.extend<{
  authenticatedPage: Page;
  mockRpc: MockRpc;
}>({
  page: async ({ page }, provide) => {
    await stubBackendHealth(page);
    await provide(page);
  },
  authenticatedPage: async ({ browser, contextOptions }, provide) => {
    const context = await browser.newContext({
      ...contextOptions,
      storageState: AUTH_STORAGE_STATE,
    });
    const page = await context.newPage();
    await stubBackendHealth(page);
    await provide(page);
    await context.close();
  },
  mockRpc: async ({ authenticatedPage }, provide) => {
    const mock = await createMockRpc(authenticatedPage);
    await provide(mock);
  },
});

export { expect } from "@playwright/test";
