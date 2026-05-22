import { expect, test } from "../support/fixtures";
import { expectNoA11yViolations } from "../support/a11y";
import {
  appScenarioMethods,
  openMovieDetail,
  openSettingsFolderPicker,
  openTVShowDetail,
  scenarioErrorResponse,
} from "../support/app-scenarios";
import { searchResponse } from "../support/seeds";

test("sign-in page has no axe violations", async ({ page }, testInfo) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "sign in with put.io" })).toBeVisible();
  await expectNoA11yViolations(page, testInfo);
});

test("session-expired sign-in has no axe violations", async ({ page }, testInfo) => {
  await page.goto("/sign-in?error=SessionExpired&callbackUrl=/movies");
  await expect(page.getByText("your session expired. sign in again to keep going.")).toBeVisible();
  await expectNoA11yViolations(page, testInfo);
});

test("search home has no axe violations", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/");
  await expect(authenticatedPage.getByLabel("What can we hook you up with?")).toBeVisible();
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("search results have no axe violations", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/search?q=synthetic");
  await expect(
    authenticatedPage.getByText("Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE").first(),
  ).toBeVisible();
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("movies catalog has no axe violations", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/movies");
  await expect(authenticatedPage.getByText("Synthetic Feature Alpha")).toBeVisible();
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("movie detail modal has no axe violations", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await openMovieDetail(authenticatedPage);
  await expectNoA11yViolations(authenticatedPage, testInfo, { include: ["[role='dialog']"] });
});

test("tv shows catalog has no axe violations", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/tv-shows");
  await expect(authenticatedPage.getByText("Synthetic Show Gamma")).toBeVisible();
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("tv show detail modal has no axe violations", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await openTVShowDetail(authenticatedPage);
  await expectNoA11yViolations(authenticatedPage, testInfo, { include: ["[role='dialog']"] });
});

test("settings page has no axe violations", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/settings");
  await expect(authenticatedPage.getByText("Search settings")).toBeVisible();
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("settings folder picker has no axe violations", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await openSettingsFolderPicker(authenticatedPage);
  await expectNoA11yViolations(authenticatedPage, testInfo, { include: ["[role='dialog']"] });
});

test("search empty state has no axe violations", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(
    appScenarioMethods({
      Search: searchResponse("synthetic-missing", []),
    }),
  );
  await authenticatedPage.goto("/search?q=synthetic-missing");
  await expect(authenticatedPage.getByText("we found absolutely nothing")).toBeVisible();
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("movies catalog error state has no axe violations", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(scenarioErrorResponse()),
    });
  });

  await authenticatedPage.goto("/movies");
  await expect(
    authenticatedPage.getByText("Service temporarily unavailable. Please try again shortly."),
  ).toBeVisible({ timeout: 5000 });
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("movie detail error state has no axe violations", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(scenarioErrorResponse()),
    });
  });

  await authenticatedPage.goto("/movies");
  await expect(authenticatedPage.getByText("Synthetic Feature Alpha")).toBeVisible();
  await authenticatedPage.locator('[data-slot="poster-card"]').first().click();
  await expect(
    authenticatedPage.getByText("Service temporarily unavailable. Please try again shortly."),
  ).toBeVisible({ timeout: 5000 });
  await expectNoA11yViolations(authenticatedPage, testInfo, { include: ["[role='dialog']"] });
});

test("crash fallback has no axe violations", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/debug/crash");
  await expect(authenticatedPage.getByText("The app hit a crash.")).toBeVisible();
  await expectNoA11yViolations(authenticatedPage, testInfo);
});

test("not found page has no axe violations", async ({ page }, testInfo) => {
  await page.goto("/definitely-not-here");
  await expect(page.getByRole("heading", { name: "page not found" })).toBeVisible();
  await expectNoA11yViolations(page, testInfo);
});
