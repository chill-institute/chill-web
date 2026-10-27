import { test, expect } from "./support/fixtures";
import { indexer, indexersResponse, searchResponse, userSettings } from "./support/seeds";

test.describe("shell search form", () => {
  test("home search input autofocuses and / keyboard shortcut refocuses it", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
    });

    await authenticatedPage.goto("/");

    const searchInput = authenticatedPage.locator("#search-global");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("maxlength", "256");
    await expect(searchInput).toBeFocused();

    await authenticatedPage.keyboard.press("Escape");
    await expect(searchInput).not.toBeFocused();

    await authenticatedPage.getByRole("button", { name: "Focus search input" }).click();
    await expect(searchInput).toBeFocused();

    await authenticatedPage.keyboard.press("Escape");
    await expect(searchInput).not.toBeFocused();

    await authenticatedPage.keyboard.press("/");
    await expect(searchInput).toBeFocused();

    await authenticatedPage.keyboard.press("Escape");
    await expect(searchInput).not.toBeFocused();
  });

  test("home page explains search query syntax", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
    });

    await authenticatedPage.goto("/");

    await authenticatedPage.getByRole("button", { name: "search tips" }).hover();
    const tips = authenticatedPage.getByRole("dialog");
    await expect(tips).toContainText(
      '"the matrix"results must include "the matrix" or "the.matrix" or "the-matrix" or "the_matrix"',
    );
    await expect(tips).toContainText("+S01E07results must include S01E07");
    await expect(tips).toContainText('-camresults never include the word "cam"');
    await expect(tips).toContainText("tt0133093some trackers accept imdb tt codes");
    await expect(tips).toContainText(
      "imdb.com/title/tt0133093chill converts imdb share links to tt codes",
    );
  });

  test("search form normalizes IMDb title URLs before navigation", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetIndexers: indexersResponse([indexer()]),
      Search: searchResponse("tt9000001", []),
    });

    await authenticatedPage.goto("/");

    const searchInput = authenticatedPage.locator("#search-global");
    await searchInput.fill("  https://www.imdb.com/title/tt9000001/?ref_=share  ");
    await authenticatedPage.getByRole("button", { name: "and chill" }).click();

    await authenticatedPage.waitForURL("**/search**");
    expect(new URL(authenticatedPage.url()).searchParams.get("q")).toBe("tt9000001");
  });

  test("search submit does not animate the route shell or content", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetIndexers: indexersResponse([indexer()]),
      Search: searchResponse("test query", []),
    });

    await authenticatedPage.goto("/");

    await authenticatedPage.locator("#search-global").fill("test query");
    await authenticatedPage.getByRole("button", { name: "and chill" }).click();
    await authenticatedPage.waitForURL("**/search**");

    const animationName = await authenticatedPage
      .locator('[data-page="search"]')
      .evaluate((element) => getComputedStyle(element).animationName);

    expect(animationName).toBe("none");
  });

  test("empty search is not submitted", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetIndexers: indexersResponse([indexer()]),
      Search: searchResponse("test query", []),
    });

    await authenticatedPage.goto("/");

    const searchInput = authenticatedPage.locator("#search-global");
    await expect(searchInput).toBeVisible();

    await searchInput.focus();
    await authenticatedPage.keyboard.press("Enter");
    await searchInput.fill("   ");
    await authenticatedPage.keyboard.press("Enter");
    await searchInput.fill("test query");
    await authenticatedPage.keyboard.press("Enter");
    await authenticatedPage.waitForURL("**/search**");

    await authenticatedPage.goBack();
    await expect.poll(() => new URL(authenticatedPage.url()).pathname).toBe("/");
  });
});
