import { expect, test } from "./support/fixtures";
import {
  indexer,
  indexersResponse,
  searchResponse,
  searchResult,
  userSettings,
} from "./support/seeds";
import { SearchResultDisplayBehavior } from "@chill-institute/contracts/chill/v4/api_pb";

for (const width of [320, 375, 768, 1280]) {
  for (const outcome of ["results", "empty", "error"] as const) {
    test(`search loading keeps controls anchored at ${width}px (${outcome})`, async ({
      authenticatedPage: page,
      mockRpc,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      let releaseSettings = () => {};
      const settingsGate = new Promise<void>((resolve) => {
        releaseSettings = resolve;
      });
      let releaseSearch = () => {};
      const searchGate = new Promise<void>((resolve) => {
        releaseSearch = resolve;
      });
      await mockRpc({ GetIndexers: indexersResponse([indexer({ id: "yts", name: "YTS" })]) });
      await page.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
        await settingsGate;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            userSettings({ searchResultDisplayBehavior: SearchResultDisplayBehavior.ALL }),
          ),
        });
      });
      await page.route("**/chill.v4.UserService/Search", async (route) => {
        await searchGate;
        await route.fulfill({
          status: outcome === "error" ? 400 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            outcome === "error"
              ? { code: "invalid_argument", message: "Search unavailable" }
              : searchResponse(
                  "movie",
                  outcome === "empty"
                    ? []
                    : [searchResult({ title: "Movie 1080p", indexer: "yts", source: "YTS" })],
                ),
          ),
        });
      });
      await page.goto("/search?q=movie");
      const filters = page.getByRole("group", { name: "Quick filters" });
      const sort = filters.getByRole("combobox", { name: "Sort results" });
      await expect(sort).toBeDisabled();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        const shifts: { value: number; sources: string[] }[] = [];
        Reflect.set(window, "loadingShifts", shifts);
        if (!PerformanceObserver.supportedEntryTypes.includes("layout-shift")) return;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!Reflect.get(entry, "hadRecentInput"))
              shifts.push({
                value: Number(Reflect.get(entry, "value")),
                sources: Reflect.get(entry, "sources").map((source: { node?: Element }) =>
                  source.node?.outerHTML?.slice(0, 200),
                ),
              });
          }
        }).observe({ type: "layout-shift" });
      });
      const before = await filters.boundingBox();
      const loadingResults = page.locator(
        width < 1024 ? 'ul[aria-label="Loading search results"]' : "table",
      );
      const resultsBefore = await loadingResults.boundingBox();
      releaseSettings();
      await expect(sort).toBeEnabled();
      expect(await filters.boundingBox()).toEqual(before);
      expect(await loadingResults.boundingBox()).toEqual(resultsBefore);
      releaseSearch();
      await expect(loadingResults).toHaveCount(outcome === "results" && width >= 1024 ? 1 : 0);
      if (outcome === "results") {
        await expect(page.getByText("Movie 1080p", { exact: true })).toBeVisible();
        const results = page.locator(width < 1024 ? 'ul[aria-label="Search results"]' : "table");
        expect((await results.boundingBox())?.y).toBe(resultsBefore?.y);
      } else {
        await expect(page.getByText("Well, we found absolutely nothing.")).toBeVisible();
      }
      expect(await filters.boundingBox()).toEqual(before);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      const shifts: { value: number; sources: string[] }[] = await page.evaluate(() =>
        Reflect.get(window, "loadingShifts"),
      );
      expect(
        shifts.reduce((total, entry) => total + entry.value, 0),
        JSON.stringify(shifts),
      ).toBeLessThan(0.01);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }
}

for (const outcome of ["success", "error"] as const) {
  test(`mobile transfer feedback preserves button and card size (${outcome})`, async ({
    authenticatedPage: page,
    mockRpc,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockRpc({
      GetUserSettings: userSettings(),
      GetIndexers: indexersResponse([indexer({ id: "yts", name: "YTS" })]),
      Search: searchResponse("movie", [
        searchResult({ title: "Movie 1080p", indexer: "yts", source: "YTS" }),
      ]),
    });
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/chill.v4.UserService/AddTransfer", async (route) => {
      await gate;
      await route.fulfill({
        status: outcome === "error" ? 400 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          outcome === "error"
            ? {
                code: "invalid_argument",
                message: "This transfer could not be added. Please try another release.",
              }
            : { status: "OK" },
        ),
      });
    });
    await page.goto("/search?q=movie");
    const card = page.locator('ul[aria-label="Search results"] li').first();
    const button = card.getByRole("button").last();
    await expect(button).toBeVisible();
    const before = await button.boundingBox();
    const cardBefore = await card.boundingBox();
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAccessibleName("sending");
    expect(await button.boundingBox()).toEqual(before);
    release();
    await expect(button).toHaveAccessibleName(
      outcome === "error" ? /transfer could not be added/ : "sent!",
    );
    expect(await button.boundingBox()).toEqual(before);
    expect(await card.boundingBox()).toEqual(cardBefore);
    if (outcome === "success") {
      await expect(button).toHaveAccessibleName("see in put.io");
      expect(await button.boundingBox()).toEqual(before);
    } else {
      await expect(
        page.getByText("This transfer could not be added. Please try another release.", {
          exact: true,
        }),
      ).toBeVisible();
    }
  });
}
