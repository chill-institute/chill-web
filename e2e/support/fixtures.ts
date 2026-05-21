import { test as base, type Page, type Route } from "@playwright/test";

import { playwrightPort } from "./port";

type MockRpcMethods = Record<string, unknown>;

type MockRpc = (methods: MockRpcMethods) => Promise<void>;

const SERVICE_PATTERN = /chill\.v4\.UserService\//;

function authStorageState(baseURL: string | undefined) {
  const origin =
    baseURL === undefined ? `http://localhost:${playwrightPort(58300)}` : new URL(baseURL).origin;

  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: "chill.auth_token", value: "test-token" }],
      },
    ],
  };
}

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
  authenticatedPage: async ({ browser, contextOptions, baseURL }, provide) => {
    const context = await browser.newContext({
      ...contextOptions,
      storageState: authStorageState(baseURL),
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
