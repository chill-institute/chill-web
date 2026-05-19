import { expect, test } from "@playwright/test";

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
});
