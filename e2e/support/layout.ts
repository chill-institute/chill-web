import { expect, type Locator } from "@playwright/test";

type ElementBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

async function elementBox(locator: Locator): Promise<ElementBox> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (box === null) throw new Error("Expected element to have a bounding box");
  return box;
}

export async function stableElementBox(locator: Locator): Promise<ElementBox> {
  let previous = await elementBox(locator);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await locator.evaluate(() => new Promise<void>((resolve) => window.setTimeout(resolve, 50)));
    const next = await elementBox(locator);
    if (
      Math.abs(next.x - previous.x) <= 1 &&
      Math.abs(next.y - previous.y) <= 1 &&
      Math.abs(next.width - previous.width) <= 1 &&
      Math.abs(next.height - previous.height) <= 1
    ) {
      return next;
    }
    previous = next;
  }
  return previous;
}

export function expectStableBox(before: ElementBox, after: ElementBox) {
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
}

export function expectStablePosition(before: ElementBox, after: ElementBox) {
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
}

export async function expectNoExcessBottomSpace(
  container: Locator,
  content: Locator,
  maxSpace = 48,
) {
  const containerBox = await stableElementBox(container);
  const contentBox = await stableElementBox(content);
  const bottomSpace = containerBox.y + containerBox.height - (contentBox.y + contentBox.height);
  expect(bottomSpace).toBeLessThanOrEqual(maxSpace);
}
