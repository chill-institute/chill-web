import { expect, test } from "./support/fixtures";

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
});

test("clears the asset-skew reload guard after the route resolves", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("chill.asset-skew-reload.v1", "1");
  });

  await page.goto("/sign-in?__chill_reload=123");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "sign in with put.io" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("chill.asset-skew-reload.v1")))
    .toBeNull();
});

test("preserves Vite preload failures for the route loader", async ({ page }) => {
  await page.goto("/sign-in");

  const defaultPrevented = await page.evaluate(() => {
    window.sessionStorage.setItem("chill.asset-skew-reload.v1", "1");
    const event = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

  expect(defaultPrevented).toBe(false);
});
