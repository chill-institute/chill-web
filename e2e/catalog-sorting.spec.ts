import { expect, test } from "./support/fixtures";
import { movie, moviesResponse, tvShow, tvShowsResponse, userSettings } from "./support/seeds";

const entries = [
  { title: "Aurora", rating: 8, year: 2020 },
  { title: "Harbor", rating: 9, year: 2010 },
  { title: "Signal", rating: 7, year: 2024 },
];

for (const path of ["movies", "tv-shows"]) {
  test(`${path} sorts in both directions and restores default order`, async ({
    authenticatedPage: page,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetMovies: moviesResponse(
        entries.map((entry, index) => movie({ ...entry, id: `m${index}` })),
      ),
      GetTVShows: tvShowsResponse(
        entries.map((entry, index) => tvShow({ ...entry, imdbId: `tt${index}` })),
      ),
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${path}?sort=invalid`);
    const sort = page.getByRole("combobox", { name: "Sort by" });
    const titles = page.locator('[data-slot="poster-card"] h2');
    await expect(sort).toHaveValue("default");
    await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
    for (const [value, expected] of [
      ["rating-desc", ["Harbor", "Aurora", "Signal"]],
      ["rating-asc", ["Signal", "Aurora", "Harbor"]],
      ["year-desc", ["Signal", "Aurora", "Harbor"]],
      ["year-asc", ["Harbor", "Aurora", "Signal"]],
    ] as const) {
      await sort.selectOption(value);
      await expect(titles).toHaveText([...expected]);
      await expect(page).toHaveURL(new RegExp(`sort=${value}`));
    }
    await page.reload();
    await expect(sort).toHaveValue("year-asc");
    await expect(titles).toHaveText(["Harbor", "Aurora", "Signal"]);
    await expect(page.locator('[data-slot="poster-card"]').first()).toHaveAttribute(
      "href",
      /sort=year-asc/,
    );
    const source = page.getByRole("combobox", {
      name: path === "movies" ? "Movie source" : "TV source",
    });
    await source.focus();
    await page.keyboard.press("Tab");
    await expect(sort).toBeFocused();
    await sort.press("Home");
    await sort.press("Enter");
    await expect(sort).toHaveValue("default");
    await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
    const sourceBox = await source.boundingBox();
    const sortBox = await sort.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(sortBox).not.toBeNull();
    expect(sortBox?.width).toBe(sourceBox?.width);
    expect(sortBox?.y).toBeGreaterThan(sourceBox?.y ?? 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });
}
