import { test, expect } from "./support/fixtures";
import { expectStableBox, stableElementBox } from "./support/layout";
import {
  movie,
  moviesResponse,
  searchResponse,
  tvShow,
  tvShowsResponse,
  userSettings,
} from "./support/seeds";

for (const width of [320, 390, 1280]) {
  for (const catalog of ["movies", "tv-shows"] as const) {
    test(`${catalog} poster rows match loading placeholders at ${width}px`, async ({
      authenticatedPage: page,
      mockRpc,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await mockRpc({ GetUserSettings: userSettings() });
      let release = () => {};
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const method = catalog === "movies" ? "GetMovies" : "GetTVShows";
      await page.route(`**/chill.v4.UserService/${method}`, async (route) => {
        await pending;
        const response =
          catalog === "movies"
            ? moviesResponse(
                Array.from({ length: 18 }, (_, index) =>
                  movie({ id: `movie-${index}`, title: `Movie ${index}` }),
                ),
              )
            : tvShowsResponse(
                Array.from({ length: 18 }, (_, index) =>
                  tvShow({ imdbId: `show-${index}`, title: `Show ${index}` }),
                ),
              );
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      });
      await page.goto(`/${catalog}`);
      const skeletons = page.locator("main article");
      await expect(skeletons).toHaveCount(18);
      const before = await Promise.all(
        [0, 2, 5].map((index) => stableElementBox(skeletons.nth(index))),
      );
      release();
      const posters = page.locator('[data-slot="poster-card"]');
      await expect(posters).toHaveCount(18);
      for (const [index, slot] of [0, 2, 5].entries()) {
        expectStableBox(before[index], await stableElementBox(posters.nth(slot)));
      }
    });
  }

  for (const outcome of ["empty", "error"] as const) {
    test(`movie drawer keeps its frame after ${outcome} at ${width}px`, async ({
      authenticatedPage: page,
      mockRpc,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await mockRpc({
        GetUserSettings: userSettings(),
        GetMovies: moviesResponse([movie({ id: "movie", title: "Aurora Protocol" })]),
      });
      let release = () => {};
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/chill.v4.UserService/Search", async (route) => {
        await pending;
        await route.fulfill({
          status: outcome === "error" ? 400 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            outcome === "error"
              ? { code: "internal", message: "torrent service unavailable" }
              : searchResponse("Aurora Protocol", []),
          ),
        });
      });
      await page.goto("/movies");
      await page.locator('[data-slot="poster-card"]').click();
      const shell = page.locator("[data-detail-modal-shell]");
      const body = page.locator("[data-detail-modal-body]");
      const beforeShell = await stableElementBox(shell);
      const beforeBody = await stableElementBox(body);
      release();
      await expect(
        outcome === "error" ? body.getByRole("alert") : body.getByText("no torrent results found"),
      ).toBeVisible();
      expectStableBox(beforeShell, await stableElementBox(shell));
      expectStableBox(beforeBody, await stableElementBox(body));
    });
  }
}
