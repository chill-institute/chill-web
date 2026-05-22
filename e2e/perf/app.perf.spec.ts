import { expect, test } from "../support/fixtures";
import { expectWithinPerformanceBudget } from "../support/performance";
import { appScenarioMethods, openMovieDetail, openTVShowDetail } from "../support/app-scenarios";

test("catalog shell stays within static asset budget", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/movies");
  await expect(authenticatedPage.getByText("Synthetic Feature Alpha")).toBeVisible();
  await expectWithinPerformanceBudget(authenticatedPage, testInfo);
});

test("search results stay within static asset budget", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await authenticatedPage.goto("/search?q=synthetic");
  await expect(
    authenticatedPage.getByText("Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE").first(),
  ).toBeVisible();
  await expectWithinPerformanceBudget(authenticatedPage, testInfo);
});

test("detail modals stay within static asset budget", async ({
  authenticatedPage,
  mockRpc,
}, testInfo) => {
  await mockRpc(appScenarioMethods());
  await openMovieDetail(authenticatedPage);
  await expectWithinPerformanceBudget(authenticatedPage, testInfo);

  await authenticatedPage.getByLabel("Close movie details").click();
  await openTVShowDetail(authenticatedPage);
  await expectWithinPerformanceBudget(authenticatedPage, testInfo);
});
