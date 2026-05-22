import type { Page, TestInfo } from "@playwright/test";

import { expect } from "./fixtures";

type PerformanceBudget = {
  jsDecodedKiB: number;
  cssDecodedKiB: number;
  resourceCount: number;
};

type PerformanceReport = {
  cssDecodedKiB: number;
  jsDecodedKiB: number;
  resourceCount: number;
  route: string;
};

export const defaultPerformanceBudget: PerformanceBudget = {
  jsDecodedKiB: 950,
  cssDecodedKiB: 160,
  resourceCount: 90,
};

export async function expectWithinPerformanceBudget(
  page: Page,
  testInfo: TestInfo,
  budget = defaultPerformanceBudget,
) {
  const report = await page.evaluate<PerformanceReport>(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const totalDecodedByExtension = (extension: string) =>
      resources
        .filter((entry) => entry.name.includes(extension))
        .reduce((total, entry) => total + entry.decodedBodySize, 0);

    return {
      route: location.pathname,
      jsDecodedKiB: Math.round(totalDecodedByExtension(".js") / 1024),
      cssDecodedKiB: Math.round(totalDecodedByExtension(".css") / 1024),
      resourceCount: resources.length,
    };
  });

  await testInfo.attach("performance-budget", {
    body: JSON.stringify({ budget, report }, null, 2),
    contentType: "application/json",
  });

  expect(report.jsDecodedKiB).toBeGreaterThan(0);
  expect(report.cssDecodedKiB).toBeGreaterThan(0);
  expect(report.resourceCount).toBeGreaterThan(0);
  expect(report.jsDecodedKiB).toBeLessThanOrEqual(budget.jsDecodedKiB);
  expect(report.cssDecodedKiB).toBeLessThanOrEqual(budget.cssDecodedKiB);
  expect(report.resourceCount).toBeLessThanOrEqual(budget.resourceCount);
}
