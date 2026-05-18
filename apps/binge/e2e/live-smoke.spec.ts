import { expect, test } from "@playwright/test";

const liveBaseURL = process.env.LIVE_BASE_URL;

test.skip(!liveBaseURL, "LIVE_BASE_URL is required for live smoke checks");

function requireLiveBaseURL() {
  if (!liveBaseURL) {
    throw new Error("LIVE_BASE_URL is required for live smoke checks");
  }

  return liveBaseURL;
}

test("live sign-in route renders over HTTPS", async ({ page }) => {
  const response = await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  expect(page.url()).toMatch(/^https:\/\//);
  await expect(page.getByRole("button", { name: "sign in with put.io" })).toBeVisible();
});

test("live HTTP redirects to HTTPS", async ({ page }) => {
  const target = new URL(requireLiveBaseURL());
  const source = new URL(target);
  source.protocol = "http:";

  await page.goto(source.href, { waitUntil: "domcontentloaded" });

  const destination = new URL(page.url());
  expect(destination.protocol).toBe("https:");
  expect(destination.host).toBe(target.host);
});
