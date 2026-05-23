import { expect, type Page, test } from "@playwright/test";

const smokeTarget = process.env.LIVE_WEB_SMOKE_TARGET;
const chillProductionDomain = process.env.CHILL_PRODUCTION_DOMAIN;
const chillStagingDomain = process.env.CHILL_STAGING_DOMAIN;
const bingeProductionDomain = process.env.BINGE_PRODUCTION_DOMAIN;
const bingeProductionRedirectDomain = process.env.BINGE_PRODUCTION_REDIRECT_DOMAIN;

test.skip(!smokeTarget, "live host smoke runs only when LIVE_WEB_SMOKE_TARGET is set");

async function expectOk(page: Page, url: string) {
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok(), `${url} should return a successful response`).toBe(true);
}

test("production app host serves the app", async ({ page }) => {
  test.skip(smokeTarget !== "production" && smokeTarget !== "production-app");
  expect(chillProductionDomain).toBeTruthy();

  await expectOk(page, `https://${chillProductionDomain}/`);
});

test("production redirect hosts resolve to the app host", async ({ page }) => {
  test.skip(smokeTarget !== "production" && smokeTarget !== "production-redirects");
  expect(chillProductionDomain).toBeTruthy();
  expect(bingeProductionDomain).toBeTruthy();
  expect(bingeProductionRedirectDomain).toBeTruthy();

  for (const host of [
    `www.${chillProductionDomain}`,
    bingeProductionDomain,
    bingeProductionRedirectDomain,
  ]) {
    await expectOk(page, `https://${host}/`);
    expect(page.url()).toMatch(new RegExp(`^https://${chillProductionDomain}/`));
  }
});

test("staging host serves the app", async ({ page }) => {
  test.skip(smokeTarget !== "staging");
  expect(chillStagingDomain).toBeTruthy();

  await expectOk(page, `https://${chillStagingDomain}/`);
});
