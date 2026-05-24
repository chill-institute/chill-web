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
  expect(source).toContain('url:"registerSW.js"');
  expect(shellLogoPath).toMatch(/^\/assets\/.+\.png$/);
  expect(source).toContain(`url:"${shellLogoPath.slice(1)}"`);
  expect(source).toContain('url:"assets/');
  expect(source).not.toContain("fonts/");
  expect(source).not.toContain("banner.png");
  expect(source).not.toContain("opengraph-image.png");
  expect(source).not.toContain("twitter-image.png");
  expect(source).not.toContain("logo-xmas.png");
  expect(source).not.toContain("test/poster.svg");
});
