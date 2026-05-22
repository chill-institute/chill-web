import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";

import { expect } from "./fixtures";

const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

type A11yScanOptions = {
  include?: string[];
};

export async function expectNoA11yViolations(
  page: Page,
  testInfo: TestInfo,
  options: A11yScanOptions = {},
) {
  let builder = new AxeBuilder({ page }).withTags(axeTags);
  for (const selector of options.include ?? []) {
    builder = builder.include(selector);
  }

  const results = await builder.analyze();
  await testInfo.attach("axe-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  expect(results.violations).toEqual([]);
}
