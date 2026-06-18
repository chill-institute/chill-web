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
  OtherFilter,
  ResolutionFilter,
  type SearchResult,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  SortBy,
  SortDirection,
} from "@chill-institute/contracts/chill/v4/api_pb";
import type { Page } from "@playwright/test";

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

type MockRpc = (methods: Record<string, unknown>) => Promise<void>;

type FastestSearchRequest = {
  indexerId: string | undefined;
  query: string;
};

type FastestSearchOptions = {
  getResults: (request: FastestSearchRequest) => SearchResult[] | Promise<SearchResult[]>;
  onSlowResolved?: () => void;
};

const fastestModeIndexers = () => [
  indexer({ id: "yts", name: "YTS" }),
  indexer({ id: "rarbg", name: "RARBG" }),
  indexer({ id: "slow", name: "SlowTracker" }),
];

function fastestIndexerResult({
  id,
  indexerId,
  title,
}: {
  id?: string;
  indexerId: string | undefined;
  title?: string;
}) {
  const safeIndexerId = indexerId ?? "unknown";
  return searchResult({
    id: id ?? `r-${safeIndexerId}`,
    title: title ?? `Ubuntu from ${safeIndexerId}`,
    indexer: safeIndexerId,
    source: indexerId?.toUpperCase() ?? "UNKNOWN",
  });
}

async function setupFastestModeSearch(
  authenticatedPage: Page,
  mockRpc: MockRpc,
  { getResults, onSlowResolved }: FastestSearchOptions,
) {
  await mockRpc(
    defaultMethods({
      GetIndexers: indexersResponse(fastestModeIndexers()),
    }),
  );

  await authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
    const body = route.request().postDataJSON();
    const indexerId = typeof body?.indexerId === "string" ? body.indexerId : undefined;
    const query = typeof body?.query === "string" ? body.query : "unknown";

    if (indexerId === "slow") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSlowResolved?.();
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(searchResponse(query, await getResults({ indexerId, query }))),
    });
  });
}

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

  test("fastest mode freezes early results until update", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await setupFastestModeSearch(authenticatedPage, mockRpc, {
      getResults: ({ indexerId }) =>
        indexerId === "slow"
          ? [
              searchResult({
                id: "r3",
                title: "Ubuntu Slow Result",
                indexer: "slow",
                source: "SlowTracker",
              }),
            ]
          : [fastestIndexerResult({ indexerId })],
    });

    await authenticatedPage.goto("/search?q=ubuntu");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });

    await expect(authenticatedPage.getByText("Fetching more from 1 indexer")).toBeHidden();
    await expect(authenticatedPage.getByText("Ubuntu Slow Result")).toBeHidden();
    const readyToastText = authenticatedPage.getByText("Found 1 more result");
    await expect(readyToastText).toBeVisible({
      timeout: 5000,
    });
    const readyToast = authenticatedPage.locator("[data-sonner-toast]").filter({
      has: readyToastText,
    });
    await expect(readyToast).not.toHaveAttribute("data-type", "loading");
    await expect(readyToast.locator(".sonner-loader")).toHaveCount(0);
    await expect(authenticatedPage.getByText("Ubuntu Slow Result")).toBeHidden();
    await authenticatedPage.getByRole("button", { name: "Update" }).click();
    await expect(authenticatedPage.getByText("Found 1 more result")).toBeHidden();
    await expect(authenticatedPage.getByText("Ubuntu Slow Result")).toBeVisible();
  });

  test("fastest mode suppresses the toast when late indexers add no results", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let slowResolved = false;

    await setupFastestModeSearch(authenticatedPage, mockRpc, {
      getResults: ({ indexerId }) =>
        indexerId === "slow" ? [] : [fastestIndexerResult({ indexerId })],
      onSlowResolved: () => {
        slowResolved = true;
      },
    });

    await authenticatedPage.goto("/search?q=ubuntu");

    await expect(authenticatedPage.locator("table tbody tr")).toHaveCount(2);
    await expect(authenticatedPage.getByText("Fetching more from 1 indexer")).toBeHidden();
    await expect.poll(() => slowResolved).toBe(true);
    await expect(authenticatedPage.getByText("Found 1 more result")).toBeHidden();
    await expect(authenticatedPage.locator("[data-sonner-toast]")).toHaveCount(0);
  });

  test("fastest mode update action switches to all results and dismisses the toast", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await setupFastestModeSearch(authenticatedPage, mockRpc, {
      getResults: ({ indexerId }) => [fastestIndexerResult({ indexerId })],
    });

    await authenticatedPage.goto("/search?q=ubuntu");

    const toastLocator = authenticatedPage.getByText("Found 1 more result");
    await expect(toastLocator).toBeVisible({ timeout: 5000 });
    await authenticatedPage.getByRole("button", { name: "Update" }).click();
    await expect(toastLocator).toBeHidden();

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(authenticatedPage.getByText("Ubuntu from slow")).toBeVisible({
      timeout: 5000,
    });
  });

  test("fastest mode toast reappears for a subsequent search", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await setupFastestModeSearch(authenticatedPage, mockRpc, {
      getResults: ({ indexerId, query }) => [
        fastestIndexerResult({
          id: `${query}-${indexerId ?? "unknown"}`,
          indexerId,
          title: `${query} from ${indexerId ?? "unknown"}`,
        }),
      ],
    });

    await authenticatedPage.goto("/search?q=ubuntu");
    const toastLocator = authenticatedPage.getByText("Found 1 more result");
    await expect(toastLocator).toBeVisible({ timeout: 5000 });
    await authenticatedPage.getByRole("button", { name: "Update" }).click();
    await expect(toastLocator).toBeHidden();

    await authenticatedPage.goto("/search?q=fedora");
    await expect(toastLocator).toBeVisible({ timeout: 5000 });
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

  test("html search responses stay in the search error surface", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(defaultMethods());
    await authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>chill.institute</title>",
      });
    });

    await authenticatedPage.goto("/search?q=ubuntu");

    await expect(
      authenticatedPage.getByRole("heading", { name: "Something went wrong." }),
    ).toBeHidden();
    await expect(
      authenticatedPage.getByText("Service temporarily unavailable. Please try again shortly."),
    ).toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByRole("alert")).toHaveCSS("max-width", "672px");
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
    await expect(authenticatedPage.getByRole("group", { name: /quick filters/i })).toBeHidden();
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

  test("mobile sort select offers both directions", async ({ authenticatedPage, mockRpc }) => {
    const results = [
      searchResult({ id: "r1", title: "Zulu Movie 1080p", seeders: 500n, indexer: "yts" }),
      searchResult({ id: "r2", title: "Alpha Movie 1080p", seeders: 10n, indexer: "yts" }),
      searchResult({ id: "r3", title: "Beta Movie 1080p", seeders: 50n, indexer: "yts" }),
    ];

    await authenticatedPage.setViewportSize({ width: 393, height: 852 });
    await mockRpc(
      allModeMethods({
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const rows = authenticatedPage.getByRole("list", { name: "Search results" }).locator("li");
    await expect(rows).toHaveCount(3);
    // Default is most peers (descending).
    await expect(rows.nth(0)).toContainText("Zulu Movie 1080p");
    await expect(rows.nth(2)).toContainText("Alpha Movie 1080p");

    const sortSelect = authenticatedPage.getByRole("combobox", { name: "Sort results" });
    await sortSelect.selectOption({ label: "↑ PEERS" });

    // Ascending: fewest peers first.
    await expect(rows.nth(0)).toContainText("Alpha Movie 1080p");
    await expect(rows.nth(1)).toContainText("Beta Movie 1080p");
    await expect(rows.nth(2)).toContainText("Zulu Movie 1080p");

    // Switching the same field back to descending still fires onChange.
    await sortSelect.selectOption({ label: "↓ PEERS" });
    await expect(rows.nth(0)).toContainText("Zulu Movie 1080p");
  });

  test("sort select reflects the active direction for a saved sort", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      allModeMethods({
        GetUserSettings: userSettings({
          sortBy: SortBy.SIZE,
          sortDirection: SortDirection.ASC,
        }),
        Search: searchResponse("movie", [
          searchResult({
            id: "r1",
            title: "Big 1080p",
            seeders: 10n,
            size: 8_000_000_000n,
            indexer: "yts",
          }),
          searchResult({
            id: "r2",
            title: "Small 1080p",
            seeders: 20n,
            size: 1_000_000_000n,
            indexer: "yts",
          }),
        ]),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    // Size-ascending must read "↑ SIZE", not "↓ SIZE", and match the result order.
    const sortSelect = authenticatedPage.getByRole("combobox", { name: "Sort results" });
    await expect(sortSelect.locator("option:checked")).toHaveText("↑ SIZE");
    await expect(authenticatedPage.locator("table tbody tr").nth(0)).toContainText("Small 1080p");
  });

  test("invalidates a saved title/source sort that is no longer offered", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      allModeMethods({
        GetUserSettings: userSettings({
          sortBy: SortBy.TITLE,
          sortDirection: SortDirection.ASC,
        }),
        Search: searchResponse("movie", [
          searchResult({ id: "r1", title: "Alpha 1080p", seeders: 10n, indexer: "yts" }),
          searchResult({ id: "r2", title: "Zeta 1080p", seeders: 20n, indexer: "yts" }),
        ]),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    // The removed title sort falls back to the default (most peers, descending).
    const sortSelect = authenticatedPage.getByRole("combobox", { name: "Sort results" });
    await expect(sortSelect.locator("option:checked")).toHaveText("↓ PEERS");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows.nth(0)).toContainText("Zeta 1080p");
    await expect(rows.nth(1)).toContainText("Alpha 1080p");
  });

  test("changing sort keeps active quick filters applied", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Alpha Movie 2160p",
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
      searchResult({
        id: "r3",
        title: "Gamma Movie 2160p",
        seeders: 100n,
        size: 2147483648n,
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
        body: JSON.stringify(
          userSettings({
            searchResultDisplayBehavior: SearchResultDisplayBehavior.ALL,
            sortBy: SortBy.SIZE,
            sortDirection: SortDirection.DESC,
          }),
        ),
      });
    });

    await authenticatedPage.goto("/search?q=movie");

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(3);

    await quickFilters.getByRole("checkbox", { name: "2160p" }).click();
    await expect(quickFilters.getByRole("checkbox", { name: "2160p" })).toBeChecked();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Gamma Movie 2160p");
    await expect(rows.nth(1)).toContainText("Alpha Movie 2160p");

    await authenticatedPage.locator("table thead button").filter({ hasText: "size" }).click();

    await expect(quickFilters.getByRole("checkbox", { name: "2160p" })).toBeChecked();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Alpha Movie 2160p");
    await expect(rows.nth(1)).toContainText("Gamma Movie 2160p");
    await expect(authenticatedPage.getByRole("row", { name: /Beta Movie 1080p/ })).toHaveCount(0);
  });

  test("new search clears temporary quick filters when remembering is off", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(allModeMethods());

    await authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
      const body = route.request().postDataJSON();
      const query = body?.query === "show" ? "show" : "movie";
      const results =
        query === "show"
          ? [
              searchResult({
                id: "show-1",
                title: "Show Alpha 1080p",
                seeders: 100n,
                indexer: "yts",
                source: "YTS",
              }),
              searchResult({
                id: "show-2",
                title: "Show Beta 720p",
                seeders: 50n,
                indexer: "yts",
                source: "YTS",
              }),
            ]
          : [
              searchResult({
                id: "movie-1",
                title: "Movie Alpha 2160p",
                seeders: 100n,
                indexer: "yts",
                source: "YTS",
              }),
              searchResult({
                id: "movie-2",
                title: "Movie Beta 1080p",
                seeders: 50n,
                indexer: "yts",
                source: "YTS",
              }),
            ];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(searchResponse(query, results)),
      });
    });

    await authenticatedPage.goto("/search?q=movie");

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(2);

    await quickFilters.getByRole("checkbox", { name: "2160p" }).click();
    await expect(quickFilters.getByRole("checkbox", { name: "2160p" })).toBeChecked();
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText("Movie Alpha 2160p");

    await authenticatedPage.getByRole("textbox", { name: "Search query" }).fill("show");
    await authenticatedPage.getByRole("button", { name: "and chill" }).click();

    await expect(authenticatedPage).toHaveURL(/\/search\?q=show$/);
    await expect(quickFilters.getByRole("checkbox", { name: "2160p" })).not.toBeChecked();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Show Alpha 1080p");
    await expect(rows.nth(1)).toContainText("Show Beta 720p");
  });

  test("remembered quick filters persist across searches", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Alpha Movie 2160p",
        seeders: 100n,
        indexer: "yts",
        source: "YTS",
      }),
      searchResult({
        id: "r2",
        title: "Beta Movie 1080p",
        seeders: 50n,
        indexer: "yts",
        source: "YTS",
      }),
    ];

    await mockRpc(
      allModeMethods({
        GetUserSettings: userSettings({
          rememberQuickFilters: true,
          resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
        }),
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    const rows = authenticatedPage.locator("table tbody tr");
    await expect(quickFilters.getByRole("checkbox", { name: "2160p" })).toBeChecked();
    await expect(rows).toHaveCount(1);

    await authenticatedPage.getByRole("textbox", { name: "Search query" }).fill("another movie");
    await authenticatedPage.getByRole("button", { name: "and chill" }).click();

    await expect(authenticatedPage).toHaveURL(/\/search\?q=another\+movie$/);
    await expect(quickFilters.getByRole("checkbox", { name: "2160p" })).toBeChecked();
    await expect(rows).toHaveCount(1);
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

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    await quickFilters.getByRole("checkbox", { name: "x265" }).check();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("x265 HEVC");
  });

  test("mobile quick filters and metadata stay compact", async ({ authenticatedPage, mockRpc }) => {
    const results = [
      searchResult({
        id: "r1",
        title: "Marvel Films (2008 to 2021) Iron Man Thor Avengers - Mp4 1080p",
        seeders: 43n,
        size: 68182605824n,
        source: "Torrents.csv",
        indexer: "torrents-csv",
      }),
    ];

    await authenticatedPage.setViewportSize({ width: 393, height: 852 });
    await mockRpc(
      allModeMethods({
        Search: searchResponse("thor", results),
      }),
    );

    await authenticatedPage.goto("/search?q=thor");

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    const firstFilter = quickFilters.getByText("720p", { exact: true });
    const lastFilter = quickFilters.getByText("2160p", { exact: true });
    await expect(firstFilter).toBeVisible();
    await expect(lastFilter).toBeVisible();

    const [firstBox, lastBox] = await Promise.all([
      firstFilter.boundingBox(),
      lastFilter.boundingBox(),
    ]);
    expect(firstBox).not.toBeNull();
    expect(lastBox).not.toBeNull();
    expect(Math.abs((firstBox?.y ?? 0) - (lastBox?.y ?? 0))).toBeLessThanOrEqual(2);

    const metadata = authenticatedPage.locator("ul[aria-label='Search results'] li").first();
    await expect(metadata).toContainText("Torrents.csv");
    await expect(metadata).toContainText("43 seeders");
    await expect(metadata).not.toContainText("·");
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
          sortBy: SortBy.SIZE,
          sortDirection: SortDirection.ASC,
        }),
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    await expect(quickFilters.getByRole("checkbox", { name: "x265" })).toBeChecked();
    await expect(quickFilters.getByRole("checkbox", { name: "2160p" })).not.toBeChecked();
    await expect(
      quickFilters.getByRole("combobox", { name: "Sort results" }).locator("option:checked"),
    ).toHaveText("↑ SIZE");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Alpha Movie 1080p x265 HDR");
    await expect(rows.nth(1)).toContainText("Gamma Movie 2160p x265 HDR");
  });

  test("does not apply a saved HDR filter that has no quick-filter control", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const results = [
      searchResult({ id: "r1", title: "Movie 1080p x264", indexer: "yts", source: "YTS" }),
      searchResult({ id: "r2", title: "Movie 2160p x265 HDR", indexer: "yts", source: "YTS" }),
    ];

    await mockRpc(
      allModeMethods({
        GetUserSettings: userSettings({
          rememberQuickFilters: true,
          otherFilters: [OtherFilter.HDR],
        }),
        Search: searchResponse("movie", results),
      }),
    );

    await authenticatedPage.goto("/search?q=movie");

    const rows = authenticatedPage.locator("table tbody tr");
    await expect(rows).toHaveCount(2);

    const quickFilters = authenticatedPage.getByRole("group", { name: /quick filters/i });
    await expect(quickFilters.getByRole("checkbox", { name: /hdr/i })).toHaveCount(0);
  });
});
