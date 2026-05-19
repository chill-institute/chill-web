import { test, expect } from "./support/fixtures";
import {
  indexer,
  indexersResponse,
  searchResponse,
  searchResult,
  userSettings,
} from "./support/seeds";
import {
  CodecFilter,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  SortBy,
  SortDirection,
} from "@chill-institute/contracts/chill/v4/api_pb";

const defaultMethods = (overrides?: Record<string, unknown>) => ({
  GetUserSettings: userSettings(),
  GetIndexers: indexersResponse([
    indexer({ id: "yts", name: "YTS" }),
    indexer({ id: "rarbg", name: "RARBG" }),
  ]),
  ...overrides,
});

const allModeMethods = (overrides?: Record<string, unknown>) => ({
  GetUserSettings: userSettings({
    searchResultDisplayBehavior: SearchResultDisplayBehavior.ALL,
  }),
  GetIndexers: indexersResponse([indexer({ id: "yts", name: "YTS" })]),
  ...overrides,
});

test.describe("search page", () => {
  test("shows search results", async ({ authenticatedPage, mockRpc }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Ubuntu 24.04 LTS 1080p x264",
        seeders: 150n,
        size: 2147483648n,
        source: "YTS",
        indexer: "yts",
      }),
      searchResult({
        id: "r2",
        title: "Ubuntu 22.04 LTS 720p",
        seeders: 80n,
        size: 1073741824n,
        source: "RARBG",
        indexer: "rarbg",
      }),
    ];

    await mockRpc(
      defaultMethods({
        Search: searchResponse("ubuntu", results),
      }),
    );

    await authenticatedPage.goto("/search?q=ubuntu");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Ubuntu 24.04 LTS 1080p x264");
    await expect(rows.nth(0)).toContainText("YTS");
    await expect(rows.nth(0)).toContainText("150");
    await expect(rows.nth(1)).toContainText("Ubuntu 22.04 LTS 720p");
  });

  test("fastest mode shows early results, then dismisses the pending toast", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const ix = [
      indexer({ id: "yts", name: "YTS" }),
      indexer({ id: "rarbg", name: "RARBG" }),
      indexer({ id: "slow", name: "SlowTracker" }),
    ];

    await mockRpc(
      defaultMethods({
        GetIndexers: indexersResponse(ix),
      }),
    );

    // Override Search to add delay for the slow indexer
    await authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
      const body = route.request().postDataJSON();
      const indexerId = body?.indexerId;

      if (indexerId === "slow") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            searchResponse("ubuntu", [
              searchResult({
                id: "r3",
                title: "Ubuntu Slow Result",
                indexer: "slow",
                source: "SlowTracker",
              }),
            ]),
          ),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          searchResponse("ubuntu", [
            searchResult({
              id: `r-${indexerId}`,
              title: `Ubuntu from ${indexerId}`,
              indexer: indexerId ?? "unknown",
              source: indexerId?.toUpperCase() ?? "UNKNOWN",
            }),
          ]),
        ),
      });
    });

    await authenticatedPage.goto("/search?q=ubuntu");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });

    const toastLocator = authenticatedPage.getByText("Fetching more from 1 indexer");
    await expect(toastLocator).toBeVisible({ timeout: 5000 });
    await expect(toastLocator).toBeHidden({ timeout: 5000 });
  });

  test("empty state", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(
      defaultMethods({
        Search: searchResponse("nonexistent", []),
      }),
    );

    await authenticatedPage.goto("/search?q=nonexistent");

    await expect(authenticatedPage.getByText("we found absolutely nothing")).toBeVisible({
      timeout: 5000,
    });
  });

  test("sends x-request-id header on rpc requests", async ({ authenticatedPage, mockRpc }) => {
    let capturedRequestID = "";

    await mockRpc(defaultMethods());
    await authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
      capturedRequestID = (await route.request().headerValue("x-request-id")) ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(searchResponse("ubuntu", [])),
      });
    });

    await authenticatedPage.goto("/search?q=ubuntu");

    await expect.poll(() => capturedRequestID).toMatch(/[0-9a-z-]{8,}/i);
  });

  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    // Use plain `page` (no auth token in storage)
    await page.goto("/search");
    await page.waitForURL("**/sign-in**");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("callbackUrl")).toBe("/search");
  });

  test("redirects stale tokens to sign-in with the current search callback", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "unauthenticated", message: "expired" }),
      });
    });

    await authenticatedPage.goto("/search?q=aurora");
    await authenticatedPage.waitForURL("**/sign-in**");

    const url = new URL(authenticatedPage.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("error")).toBe("SessionExpired");
    expect(url.searchParams.get("callbackUrl")).toBe("/search?q=aurora");
  });

  test("quick filter narrows results to matching resolution", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Movie 1080p x264 BluRay",
        seeders: 100n,
        indexer: "yts",
        source: "YTS",
      }),
      searchResult({
        id: "r2",
        title: "Movie 720p x264",
        seeders: 50n,
        indexer: "yts",
        source: "YTS",
      }),
      searchResult({
        id: "r3",
        title: "Movie 2160p HDR",
        seeders: 200n,
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      allModeMethods({
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(3);

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    await quickFilters.getByRole("checkbox", { name: "1080p" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Movie 1080p x264 BluRay");

    await quickFilters.getByRole("checkbox", { name: "1080p" }).click();
    await quickFilters.getByRole("checkbox", { name: "720p" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Movie 720p x264");
  });

  test("filter-empty state when filters eliminate all results", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Movie BluRay Rip",
        seeders: 100n,
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      defaultMethods({
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(1);

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    await quickFilters.getByRole("checkbox", { name: "1080p" }).click();
    await expect(authenticatedPage.getByText("Those filters")).toBeVisible({ timeout: 5000 });
  });

  test("add transfer from search results", async ({ authenticatedPage, mockRpc }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Ubuntu 24.04 LTS",
        link: "magnet:?xt=urn:btih:abc",
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      allModeMethods({
        Search: searchResponse("ubuntu", results),
        AddTransfer: { status: "OK" },
      }),
    );

    await authenticatedPage.goto("/search?q=ubuntu");

    const firstRow = authenticatedPage.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible();

    const sendButton = firstRow.getByRole("button", {
      name: "send to put.io",
    });
    await sendButton.click();

    await expect(firstRow.getByText("sent!")).toBeVisible();
  });

  test("saved title link preference renders release titles as links", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Ubuntu 24.04 LTS",
        link: "magnet:?xt=urn:btih:abc",
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      allModeMethods({
        GetUserSettings: userSettings({
          searchResultDisplayBehavior: SearchResultDisplayBehavior.ALL,
          searchResultTitleBehavior: SearchResultTitleBehavior.LINK,
        }),
        Search: searchResponse("ubuntu", results),
      }),
    );

    await authenticatedPage.goto("/search?q=ubuntu");

    const firstRow = authenticatedPage.locator("table tbody tr").first();
    const titleLink = firstRow.getByRole("link", { name: "Ubuntu 24.04 LTS" });
    await expect(titleLink).toHaveAttribute("href", "magnet:?xt=urn:btih:abc");
    await expect(titleLink).toHaveAttribute("target", "_blank");
    await expect(titleLink).toHaveAttribute("rel", "noreferrer noopener");
  });

  test("no query shows idle state", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(allModeMethods());

    await authenticatedPage.goto("/search");

    // No results, no empty state, no loading — just idle
    await expect(authenticatedPage.locator("table")).toBeHidden();
    await expect(authenticatedPage.getByText("we found absolutely nothing")).toBeHidden();
  });

  test("column header sort changes result order", async ({ authenticatedPage, mockRpc }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Alpha Movie 1080p",
        seeders: 10n,
        size: 3221225472n,
        indexer: "yts",
        source: "YTS",
      }),
      searchResult({
        id: "r2",
        title: "Beta Movie 1080p",
        seeders: 500n,
        size: 1073741824n,
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      allModeMethods({
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });

    await authenticatedPage.goto("/search?q=movie");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(2);

    await expect(rows.nth(0)).toContainText("Beta Movie");
    await expect(rows.nth(1)).toContainText("Alpha Movie");

    await authenticatedPage.locator("table thead button").filter({ hasText: "size" }).click();

    await expect(rows.nth(0)).toContainText("Alpha Movie");
    await expect(rows.nth(1)).toContainText("Beta Movie");
  });

  test("codec filter narrows results", async ({ authenticatedPage, mockRpc }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Movie 1080p x264",
        indexer: "yts",
        source: "YTS",
      }),
      searchResult({
        id: "r2",
        title: "Movie 1080p x265 HEVC",
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      allModeMethods({
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(2);

    const filterBar = authenticatedPage.locator("#quick-filters");
    await filterBar.locator("label").filter({ hasText: "x265" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("x265 HEVC");
  });

  test("applies remembered quick filters and saved sort on first load", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Gamma Movie 2160p x265 HDR",
        seeders: 100n,
        size: 2147483648n,
        indexer: "yts",
        source: "YTS",
      }),
      searchResult({
        id: "r2",
        title: "Alpha Movie 1080p x265 HDR",
        seeders: 300n,
        size: 1073741824n,
        indexer: "yts",
        source: "YTS",
      }),
      searchResult({
        id: "r3",
        title: "Beta Movie 1080p x264",
        seeders: 500n,
        size: 3221225472n,
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      allModeMethods({
        GetUserSettings: userSettings({
          rememberQuickFilters: true,
          codecFilters: [CodecFilter.X265],
          sortBy: SortBy.TITLE,
          sortDirection: SortDirection.ASC,
        }),
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const filterBar = authenticatedPage.locator("#quick-filters");
    await expect(filterBar.locator("input#codec-2")).toBeChecked();
    await expect(filterBar.locator("input#res-3")).not.toBeChecked();
    await expect(filterBar.locator("input#other-1")).not.toBeChecked();

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Alpha Movie 1080p x265 HDR");
    await expect(rows.nth(1)).toContainText("Gamma Movie 2160p x265 HDR");
  });
});
