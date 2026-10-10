import { expect, test } from "./support/fixtures";

const securityTxtPath = "/.well-known/security.txt";
const canonical = `Canonical: https://chill.institute${securityTxtPath}`;

test("serves security.txt at the well-known path", async ({ request }) => {
  const response = await request.get(securityTxtPath);

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^text\/plain\b/);
  const body = await response.text();
  expect(body).toMatch(/^Contact: mailto:\S+@\S+$/m);
  expect(body).toContain(canonical);
});

test("leaves security.txt paths to the network under the service worker", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(
      () =>
        page.evaluate(async () =>
          (await navigator.serviceWorker.getRegistrations()).some(
            (registration) => registration.active?.state === "activated",
          ),
        ),
      { timeout: 10_000 },
    )
    .toBe(true);

  const response = await page.goto(securityTxtPath);
  expect(response?.fromServiceWorker()).toBe(false);
  await expect(page.locator("body")).toContainText(canonical);

  const legacyResponse = await page.goto("/security.txt");
  expect(legacyResponse?.fromServiceWorker()).toBe(false);
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
});
