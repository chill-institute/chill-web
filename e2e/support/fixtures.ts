import { expect as playwrightExpect, test as base, type Page, type Route } from "@playwright/test";

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

async function createMockRpc(page: Page, unexpectedMethods: Set<string>): Promise<MockRpc> {
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
      const unexpectedMethod = method ?? "unknown UserService method";
      unexpectedMethods.add(unexpectedMethod);
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "internal",
          message: `Unexpected test RPC: ${unexpectedMethod}`,
        }),
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

export function readSubmittedSettings(route: Route): unknown {
  const requestBody: unknown = route.request().postDataJSON();
  const settings =
    typeof requestBody === "object" && requestBody !== null
      ? Reflect.get(requestBody, "settings")
      : undefined;
  playwrightExpect(settings, "SaveUserSettings request must include settings").toBeDefined();
  return settings;
}

export async function fulfillSubmittedSettings(route: Route) {
  const settings = readSubmittedSettings(route);
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(settings),
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
    const unexpectedMethods = new Set<string>();
    const mock = await createMockRpc(authenticatedPage, unexpectedMethods);
    await provide(mock);
    playwrightExpect(
      [...unexpectedMethods].sort(),
      "Every UserService RPC must have an explicit browser-test response",
    ).toEqual([]);
  },
});

export { expect } from "@playwright/test";
