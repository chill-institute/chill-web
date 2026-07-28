import type { Page } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import { indexer, indexersResponse, searchResponse, userSettings } from "./support/seeds";

test("is installable as a home-screen app", async ({ context, page }) => {
  const client = await context.newCDPSession(page);
  await client.send("Page.enable");

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.json");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );

  const manifestResponse = await page.request.get("/manifest.json");
  expect(manifestResponse.ok()).toBe(true);
  const manifestBody = await manifestResponse.json();
  expect(manifestBody).toMatchObject({
    icons: [
      { sizes: "64x64 32x32 24x24 16x16", src: "favicon.ico" },
      { purpose: "any", sizes: "192x192", src: "logo192.png" },
      { purpose: "maskable", sizes: "192x192", src: "logo192-maskable.png" },
      { purpose: "any", sizes: "512x512", src: "logo512.png" },
      { purpose: "maskable", sizes: "512x512", src: "logo512-maskable.png" },
    ],
  });

  const manifest = await client.send("Page.getAppManifest");
  expect(manifest.url).toContain("/manifest.json");
  expect(manifest.errors).toEqual([]);

  const installability = await client.send("Page.getInstallabilityErrors");
  expect(installability.installabilityErrors).toEqual([]);

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) {
            return false;
          }

          const registrations = await navigator.serviceWorker.getRegistrations();
          return registrations.some((registration) =>
            registration.active?.scriptURL.endsWith("/sw.js"),
          );
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
});

test("keeps the service worker precache focused on the app shell", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const shellLogoUrl = await page.locator('img[src^="/assets/"]').first().getAttribute("src");
  const shellLogoPath = shellLogoUrl ?? "";

  const serviceWorker = await page.request.get("/sw.js");
  expect(serviceWorker.ok()).toBe(true);
  const source = await serviceWorker.text();

  expect(source).toContain('url:"index.html"');
  expect(source).not.toContain("registerSW.js");
  expect(shellLogoPath).toMatch(/^\/assets\/.+\.png$/);
  expect(source).toContain(`url:"${shellLogoPath.slice(1)}"`);
  expect(source).toContain('url:"assets/');
  expect(source).not.toContain("fonts/");
  expect(source).not.toContain("banner.png");
  expect(source).not.toContain("opengraph-image.png");
  expect(source).not.toContain("twitter-image.png");
  expect(source).not.toContain("logo-xmas.png");
  expect(source).not.toContain("logo192-maskable.png");
  expect(source).not.toContain("logo512-maskable.png");
  expect(source).not.toContain("test/poster.svg");
  expect(source).toContain('self.addEventListener("message"');
  expect(source).toContain('"SKIP_WAITING"');
  expect(source.match(/self\.skipWaiting\(\)/g)).toHaveLength(1);
  expect(source).not.toContain("clientsClaim");
});

test.describe("route chunk recovery", () => {
  test.use({ serviceWorkers: "block" });

  const preloadErrorMessagesKey = "chill.test.preload-error-messages";

  const methods = {
    GetUserSettings: userSettings(),
    GetIndexers: indexersResponse([indexer()]),
    Search: searchResponse("stale chunk", []),
  };

  async function observePreloadErrors(page: Page) {
    await page.addInitScript((storageKey) => {
      window.addEventListener("vite:preloadError", (event) => {
        const payload: unknown = Reflect.get(event, "payload");
        const message = payload instanceof Error ? payload.message : String(payload);
        const stored: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]");
        const messages = Array.isArray(stored) ? stored : [];
        window.sessionStorage.setItem(storageKey, JSON.stringify([...messages, message]));
      });
    }, preloadErrorMessagesKey);
  }

  async function expectPreloadErrorMessages(page: Page, browserName: string) {
    const messages: unknown = await page.evaluate(
      (storageKey) => JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]"),
      preloadErrorMessagesKey,
    );
    expect(messages).toBeInstanceOf(Array);
    if (!Array.isArray(messages)) throw new Error("expected preload error messages");
    expect(messages.length).toBeGreaterThan(0);
    if (browserName === "webkit") {
      expect(new Set(messages)).toEqual(new Set(["Importing a module script failed."]));
    }
  }

  test("reloads once when an emitted route chunk is briefly unavailable", async ({
    authenticatedPage,
    browserName,
    mockRpc,
  }) => {
    let completedPageLoads = 0;
    let failedChunkRequests = 0;
    let targetChunkPath: string | undefined;

    authenticatedPage.on("load", () => {
      if (authenticatedPage.url().includes("/search?q=stale+chunk")) {
        completedPageLoads += 1;
      }
    });
    await authenticatedPage.route(/\/assets\/search-[^/?]+\.js(?:\?.*)?$/, async (route) => {
      const chunkPath = new URL(route.request().url()).pathname;
      targetChunkPath ??= chunkPath;

      if (chunkPath === targetChunkPath && failedChunkRequests === 0) {
        failedChunkRequests += 1;
        await route.abort("connectionfailed");
        return;
      }

      await route.continue();
    });
    await mockRpc(methods);
    await observePreloadErrors(authenticatedPage);

    await authenticatedPage.goto("/search?q=stale+chunk");

    await expect.poll(() => completedPageLoads).toBe(2);
    await expect(authenticatedPage.locator('[data-page="search"]')).toBeVisible();
    await expect.poll(() => failedChunkRequests).toBe(1);
    await expect
      .poll(() =>
        authenticatedPage.evaluate(
          () =>
            Object.keys(window.sessionStorage).filter((key) =>
              key.startsWith("tanstack_router_reload:"),
            ).length,
        ),
      )
      .toBe(1);
    await expectPreloadErrorMessages(authenticatedPage, browserName);
  });

  test("recovers once without reporting a page error when session storage is unavailable", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let completedPageLoads = 0;
    let failedChunkRequests = 0;
    let targetChunkPath: string | undefined;
    const pageErrors: string[] = [];

    authenticatedPage.on("load", () => {
      if (authenticatedPage.url().includes("/search?q=stale+chunk")) {
        completedPageLoads += 1;
      }
    });
    authenticatedPage.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    await authenticatedPage.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        configurable: true,
        get() {
          throw new DOMException("Session storage is unavailable.", "SecurityError");
        },
      });
    });
    await authenticatedPage.route(/\/assets\/search-[^/?]+\.js(?:\?.*)?$/, async (route) => {
      const chunkPath = new URL(route.request().url()).pathname;
      targetChunkPath ??= chunkPath;

      if (chunkPath === targetChunkPath && failedChunkRequests === 0) {
        failedChunkRequests += 1;
        await route.fulfill({ status: 404, contentType: "text/plain", body: "Not found\n" });
        return;
      }

      await route.continue();
    });
    await mockRpc(methods);

    await authenticatedPage.goto("/search?q=stale+chunk");

    await expect(authenticatedPage.locator('[data-page="search"]')).toBeVisible();
    expect(failedChunkRequests).toBe(1);
    expect(completedPageLoads).toBe(2);
    expect(pageErrors).toEqual([]);
    expect(new URL(authenticatedPage.url()).searchParams.has("__chill_reload")).toBe(false);
  });

  test("surfaces a persistent route chunk failure without reloading again", async ({
    authenticatedPage,
    browserName,
    mockRpc,
  }) => {
    let completedPageLoads = 0;
    let failedChunkRequests = 0;
    let targetChunkPath: string | undefined;

    authenticatedPage.on("load", () => {
      if (authenticatedPage.url().includes("/search?q=stale+chunk")) {
        completedPageLoads += 1;
      }
    });
    await authenticatedPage.route(/\/assets\/search-[^/?]+\.js(?:\?.*)?$/, async (route) => {
      const chunkPath = new URL(route.request().url()).pathname;
      targetChunkPath ??= chunkPath;

      if (chunkPath === targetChunkPath) {
        failedChunkRequests += 1;
        await route.fulfill({ status: 404, contentType: "text/plain", body: "Not found\n" });
        return;
      }

      await route.continue();
    });
    await mockRpc(methods);
    await observePreloadErrors(authenticatedPage);

    await authenticatedPage.goto("/search?q=stale+chunk");

    await expect.poll(() => completedPageLoads).toBe(2);
    expect(failedChunkRequests).toBeGreaterThan(0);
    await expect(
      authenticatedPage.getByRole("heading", { name: "Something went wrong." }),
    ).toBeVisible();
    await authenticatedPage.waitForTimeout(750);
    expect(completedPageLoads).toBe(2);
    expect(
      await authenticatedPage.evaluate(
        () =>
          Object.keys(window.sessionStorage).filter((key) =>
            key.startsWith("tanstack_router_reload:"),
          ).length,
      ),
    ).toBe(1);
    await expectPreloadErrorMessages(authenticatedPage, browserName);
  });
});
