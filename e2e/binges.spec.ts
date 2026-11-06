import { expect, test } from "./support/fixtures";
import { BingeMediaType } from "@chill-institute/contracts/chill/v4/api_pb";
import { appScenarioMethods } from "./support/app-scenarios";
import {
  binge,
  bingeItem,
  bingeResponse,
  bingesResponse,
  createBingeResponse,
  deleteBingeResponse,
  searchBingeTitlesResponse,
  setBingeCuratorNameResponse,
  updateBingeResponse,
} from "./support/seeds";

const latest = binge();
const older = binge({
  id: "binge-older",
  title: "Comfort rewatches",
  blurb: "",
  items: [bingeItem({ comment: "" })],
});

type Page = import("@playwright/test").Page;

function bingeSection(page: Page) {
  return page.locator('[data-slot="binge-section"]');
}

function connectError(status: number, code: string, message: string) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ code, message }),
  };
}

async function routeInSequence(page: Page, method: string, responses: unknown[]) {
  let calls = 0;
  await page.route(new RegExp(`UserService/${method}$`), async (route) => {
    const response = responses[Math.min(calls, responses.length - 1)];
    calls += 1;
    await route.fulfill(
      typeof response === "object" && response !== null && "status" in response
        ? (response as ReturnType<typeof connectError>)
        : { status: 200, contentType: "application/json", body: JSON.stringify(response) },
    );
  });
  return () => calls;
}

test.describe("binges on the home page", () => {
  test("shows the latest binge with its titles and comments", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([latest]) }));

    await authenticatedPage.goto("/");

    const section = bingeSection(authenticatedPage);
    await expect(section.getByText("latest binge")).toBeVisible();
    await expect(section.getByText("handpicked by a real person")).toBeVisible();
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toBeVisible();
    await expect(section.getByText("by the night shift · Oct 20, 2026")).toBeVisible();
    await expect(section.getByText("Three nights of quiet dread")).toBeVisible();
    await expect(section.locator('[data-slot="binge-item"]')).toHaveCount(2);
    await expect(section.getByText("start here, no spoilers")).toBeVisible();
    await expect(section.getByText("season one only")).toBeVisible();
    const index = section.locator('[data-slot="binge-index"]');
    await expect(index.getByRole("button")).toHaveCount(1);
    await expect(index.getByRole("button", { name: /Signals in the dark/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(section.locator('[data-slot="binge-handpicked"]')).toBeVisible();
    await expect(section.getByRole("button", { name: "new binge" })).toHaveCount(0);
    await expect(section.getByRole("button", { name: "Edit this binge" })).toHaveCount(0);
  });

  test("stays out of the way when there are no binges", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([]) }));

    await authenticatedPage.goto("/");

    await expect(authenticatedPage.locator("#search-global")).toBeVisible();
    await expect(bingeSection(authenticatedPage)).toHaveCount(0);
  });

  test("shows nothing while binges load or when they fail", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([latest]) }));
    let releaseBinges = () => {};
    const bingesHeld = new Promise<void>((resolve) => {
      releaseBinges = resolve;
    });
    await authenticatedPage.route(/UserService\/ListBinges/, async (route) => {
      await bingesHeld;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "internal", message: "binges are down" }),
      });
    });

    await authenticatedPage.goto("/");

    await expect(authenticatedPage.locator("#search-global")).toBeVisible();
    await expect(bingeSection(authenticatedPage)).toHaveCount(0);
    const failedBinges = authenticatedPage.waitForResponse(/UserService\/ListBinges/);
    releaseBinges();
    await failedBinges;
    await expect(authenticatedPage.getByRole("alert")).toHaveCount(0);
    await expect(bingeSection(authenticatedPage)).toHaveCount(0);
  });

  test("lists every binge, marks the shown one, and deep links to them", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([latest, older]),
        GetBinge: bingeResponse(older),
      }),
    );

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    const index = section.locator('[data-slot="binge-index"]');
    await expect(index.getByText("all binges")).toBeVisible();
    await expect(index.getByRole("button")).toHaveCount(2);
    await expect(index.locator('[aria-current="true"]')).toHaveText(/Signals in the dark/);
    await expect(
      index.getByRole("listitem").filter({ hasText: "Comfort rewatches" }),
    ).toContainText("by the night shift · 1 title");
    await index.getByRole("button", { name: /Comfort rewatches/ }).click();

    await authenticatedPage.waitForURL("**/?binge=binge-older");
    await expect(section.getByRole("heading", { name: "Comfort rewatches" })).toBeVisible();
    await expect(section.locator('[data-slot="binge-item"]')).toHaveCount(1);
    await expect(index.locator('[aria-current="true"]')).toHaveText(/Comfort rewatches/);
    await expect(index.getByRole("button", { name: /Signals in the dark/ })).toContainText(
      "latest",
    );

    await authenticatedPage.reload();
    await expect(
      bingeSection(authenticatedPage).getByRole("heading", { name: "Comfort rewatches" }),
    ).toBeVisible();
  });

  test("lists a curator's binges from their name", async ({ authenticatedPage, mockRpc }) => {
    const byOther = binge({
      id: "binge-other-curator",
      title: "Slow cinema",
      items: [bingeItem({ comment: "" })],
      curatorName: "late reels",
    });
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([latest, older, byOther]),
        GetBinge: bingeResponse(byOther),
      }),
    );

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    const index = section.locator('[data-slot="binge-index"]');
    await expect(index.getByRole("button", { name: /Comfort rewatches|Slow cinema/ })).toHaveCount(
      2,
    );

    await section.getByRole("link", { name: "the night shift" }).first().click();
    await authenticatedPage.waitForURL(/curator=the(\+|%20)night(\+|%20)shift/);
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toHaveCount(0);
    await expect(index.getByText("binges by the night shift")).toBeVisible();
    await expect(index.getByRole("button", { name: /Signals in the dark/ })).toBeVisible();
    await expect(index.getByRole("button", { name: /Comfort rewatches/ })).toBeVisible();
    await expect(index.getByRole("button", { name: /Slow cinema/ })).toHaveCount(0);

    await index.getByRole("button", { name: "all binges" }).click();
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toBeVisible();

    await index.getByRole("link", { name: "late reels" }).click();
    await expect(index.getByText("binges by late reels")).toBeVisible();
    await expect(index.getByRole("button")).toHaveCount(2);

    await index.getByRole("button", { name: /Slow cinema/ }).click();
    await authenticatedPage.waitForURL("**/?binge=binge-other-curator");
    await expect(section.getByRole("heading", { name: "Slow cinema" })).toBeVisible();
  });

  test("opens movie and tv show details from binge items", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([latest]) }));

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);

    await section.getByRole("button", { name: "Synthetic Feature Alpha details" }).click();
    await expect(
      authenticatedPage.getByText("Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE"),
    ).toBeVisible();
    await authenticatedPage.getByRole("button", { name: "Close movie details" }).click();

    await section.getByRole("button", { name: "Synthetic Show Gamma details" }).click();
    await expect(authenticatedPage.getByText("Pilot")).toBeVisible();
  });
});

test.describe("binge curation", () => {
  test("viewers never see curator controls", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([latest]) }));

    await authenticatedPage.goto("/");

    const section = bingeSection(authenticatedPage);
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toBeVisible();
    await expect(section.getByRole("button", { name: "new binge" })).toHaveCount(0);
    await expect(section.getByRole("button", { name: "Edit this binge" })).toHaveCount(0);
  });

  test("a curator publishes a new binge", async ({ authenticatedPage, mockRpc }) => {
    const published = binge({ id: "binge-new", title: "Fresh binge", blurb: "Just added." });
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([], { canCurate: true }),
        SetBingeCuratorName: setBingeCuratorNameResponse("Night Shift"),
        CreateBinge: createBingeResponse(published),
        GetBinge: bingeResponse(published),
        SearchBingeTitles: searchBingeTitlesResponse([
          {
            imdbId: "tt9000003",
            mediaType: BingeMediaType.TV_SHOW,
            title: "Synthetic Show Gamma",
            year: 2025,
          },
        ]),
      }),
    );

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    await expect(section.getByText("no binges yet")).toBeVisible();
    await section.getByRole("button", { name: "new binge" }).click();

    const editor = authenticatedPage.getByRole("dialog");
    await editor.getByRole("button", { name: "publish binge" }).click();
    await expect(editor.getByText("pick a name of at least 2 characters")).toBeVisible();
    await expect(editor.getByText("give the binge a title")).toBeVisible();
    await expect(editor.getByText("add at least one title")).toBeVisible();

    await editor.getByLabel("your curator name").fill("  Night   Shift ");
    await editor.getByLabel("title", { exact: true }).fill("Fresh binge");
    await editor.getByLabel("blurb", { exact: true }).fill("Just added.");
    const addTitle = editor.getByLabel("add a title");
    const rows = editor.locator('[data-slot="binge-editor-item"]');
    await addTitle.fill("https://www.imdb.com/title/tt9000001/");
    await editor.getByRole("option", { name: "add tt9000001" }).click();
    await expect(addTitle).toHaveValue("");
    await expect(rows).toHaveCount(1);
    await rows.first().getByRole("button", { name: "add note" }).click();
    await editor.getByLabel("note for tt9000001").fill("start here");
    await addTitle.fill("gamma");
    await editor.getByRole("option", { name: /Synthetic Show Gamma \(2025\)/ }).click();
    await expect(rows.nth(1)).toContainText("Synthetic Show Gamma");
    await addTitle.fill("tt9000001");
    await addTitle.press("Enter");
    await expect(editor.getByText("tt9000001 is already in this binge")).toBeVisible();
    await expect(rows).toHaveCount(2);
    await editor.getByRole("button", { name: /^move Synthetic Show Gamma/ }).press("ArrowUp");
    await expect(rows.first()).toContainText("Synthetic Show Gamma");

    const named = authenticatedPage.waitForRequest(/UserService\/SetBingeCuratorName/);
    const request = authenticatedPage.waitForRequest(/UserService\/CreateBinge/);
    await editor.getByRole("button", { name: "publish binge" }).click();
    expect((await named).postDataJSON()).toEqual({ displayName: "Night Shift" });
    expect((await request).postDataJSON()).toEqual({
      title: "Fresh binge",
      blurb: "Just added.",
      items: [{ imdbId: "tt9000003" }, { imdbId: "tt9000001", comment: "start here" }],
    });

    await authenticatedPage.waitForURL("**/?binge=binge-new");
    await expect(editor).toHaveCount(0);
    await expect(section.getByRole("heading", { name: "Fresh binge" })).toBeVisible();
  });

  test("a curator edits and deletes the shown binge", async ({ authenticatedPage, mockRpc }) => {
    const renamed = binge({ title: "Signals in the dark, revisited" });
    await mockRpc(
      appScenarioMethods({
        GetBinge: bingeResponse(renamed),
        UpdateBinge: updateBingeResponse(renamed),
        DeleteBinge: deleteBingeResponse(),
      }),
    );
    await routeInSequence(authenticatedPage, "ListBinges", [
      bingesResponse([latest], { canCurate: true, curatorName: "the night shift" }),
      connectError(500, "internal", "binges are down"),
    ]);

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    await section.getByRole("button", { name: "Edit this binge" }).click();

    const editor = authenticatedPage.getByRole("dialog");
    await expect(editor.getByText("publishing as the night shift")).toBeVisible();
    await expect(editor.getByLabel("your curator name")).toHaveCount(0);
    await expect(editor.getByLabel("title", { exact: true })).toHaveValue("Signals in the dark");
    const rows = editor.locator('[data-slot="binge-editor-item"]');
    await expect(rows.nth(1)).toContainText("Synthetic Show Gamma");
    await expect(editor.getByLabel("note for Synthetic Show Gamma")).toHaveValue("season one only");

    await editor.getByRole("button", { name: "remove Synthetic Show Gamma" }).click();
    await expect(rows).toHaveCount(1);
    await editor.getByLabel("title", { exact: true }).fill("Signals in the dark, revisited");
    const update = authenticatedPage.waitForRequest(/UserService\/UpdateBinge/);
    await editor.getByRole("button", { name: "save binge" }).click();
    expect((await update).postDataJSON()).toEqual({
      id: "binge-latest",
      title: "Signals in the dark, revisited",
      blurb: "Three nights of quiet dread, in the order we would watch them.",
      items: [{ imdbId: "tt9000001", comment: "start here, no spoilers" }],
    });
    await expect(editor).toHaveCount(0);
    await expect(
      section.getByRole("heading", { name: "Signals in the dark, revisited" }),
    ).toBeVisible();
    await expect(
      section
        .locator('[data-slot="binge-index"]')
        .getByRole("button", { name: /Signals in the dark, revisited/ }),
    ).toBeVisible();

    await section.getByRole("button", { name: "Edit this binge" }).click();
    await editor.getByRole("button", { name: "delete" }).click();
    const remove = authenticatedPage.waitForRequest(/UserService\/DeleteBinge/);
    await editor.getByRole("button", { name: "really delete" }).click();
    expect((await remove).postDataJSON()).toEqual({ id: "binge-latest" });
    await expect(editor).toHaveCount(0);
    expect(new URL(authenticatedPage.url()).search).toBe("");
    await expect(section.getByRole("heading", { name: /Signals in the dark/ })).toHaveCount(0);
    await expect(section.getByRole("button", { name: "Edit this binge" })).toHaveCount(0);
  });

  test("renaming the curator while saving keeps the saved binge on screen", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const revised = binge({
      ...older,
      title: "Comfort rewatches, again",
      curatorName: "Day Shift",
    });
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([latest, older], {
          canCurate: true,
          curatorName: "the night shift",
        }),
        SetBingeCuratorName: setBingeCuratorNameResponse("Day Shift"),
        UpdateBinge: updateBingeResponse(revised),
      }),
    );
    let bingeReads = 0;
    const heldBingeReads: Array<() => Promise<void>> = [];
    await authenticatedPage.route(/UserService\/GetBinge$/, (route) => {
      bingeReads += 1;
      const fulfill = () =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(bingeResponse(older)),
        });
      if (bingeReads === 1) return fulfill();
      return new Promise<void>((resolve) => heldBingeReads.push(() => fulfill().then(resolve)));
    });

    await authenticatedPage.goto("/?binge=binge-older");
    const section = bingeSection(authenticatedPage);
    await expect(section.getByRole("heading", { name: "Comfort rewatches" })).toBeVisible();
    await section.getByRole("button", { name: "Edit this binge" }).click();
    const editor = authenticatedPage.getByRole("dialog");
    await editor.getByRole("button", { name: "change" }).click();
    await editor.getByLabel("your curator name").fill("Day Shift");
    await editor.getByLabel("title", { exact: true }).fill("Comfort rewatches, again");
    const updated = authenticatedPage.waitForResponse(/UserService\/UpdateBinge/);
    await editor.getByRole("button", { name: "save binge" }).click();
    await updated;
    await expect(editor).toHaveCount(0);

    await Promise.all(heldBingeReads.map((release) => release()));
    await authenticatedPage.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(section.getByRole("heading", { name: "Comfort rewatches, again" })).toBeVisible();
    await expect(section.getByText(/^by Day Shift/)).toBeVisible();
  });

  test("enter adds the match for the text just typed, not the previous search", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([], { canCurate: true, curatorName: "the night shift" }),
      }),
    );
    let releaseSecondSearch = () => {};
    const secondSearchHeld = new Promise<void>((resolve) => {
      releaseSecondSearch = resolve;
    });
    const matchesByQuery: Record<string, Parameters<typeof searchBingeTitlesResponse>[0]> = {
      signal: [
        { imdbId: "tt9100001", mediaType: BingeMediaType.MOVIE, title: "Signal Fires", year: 2001 },
      ],
      signals: [
        {
          imdbId: "tt9100002",
          mediaType: BingeMediaType.MOVIE,
          title: "Signals Return",
          year: 2004,
        },
      ],
    };
    await authenticatedPage.route(/UserService\/SearchBingeTitles/, async (route) => {
      const { query } = route.request().postDataJSON() as { query: string };
      if (query === "signals") await secondSearchHeld;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(searchBingeTitlesResponse(matchesByQuery[query] ?? [])),
      });
    });

    await authenticatedPage.goto("/");
    await bingeSection(authenticatedPage).getByRole("button", { name: "new binge" }).click();
    const editor = authenticatedPage.getByRole("dialog");
    const addTitle = editor.getByLabel("add a title");
    await addTitle.fill("signal");
    await expect(editor.getByRole("option", { name: /Signal Fires \(2001\)/ })).toBeVisible();

    await addTitle.fill("signals");
    await expect(editor.getByRole("option", { name: /Signal Fires \(2001\)/ })).toBeDisabled();
    await addTitle.press("Enter");
    const rows = editor.locator('[data-slot="binge-editor-item"]');
    await expect(rows).toHaveCount(0);
    releaseSecondSearch();

    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Signals Return");
    await expect(addTitle).toHaveValue("");
  });

  test("a note stays open and focused while its text is cleared", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([latest], { canCurate: true, curatorName: "the night shift" }),
      }),
    );

    await authenticatedPage.goto("/");
    await bingeSection(authenticatedPage).getByRole("button", { name: "Edit this binge" }).click();
    const editor = authenticatedPage.getByRole("dialog");
    const note = editor.getByLabel("note for Synthetic Feature Alpha");
    await expect(note).toHaveValue("start here, no spoilers");

    await note.press("ControlOrMeta+a");
    await note.press("Backspace");
    await expect(note).toHaveValue("");
    await expect(note).toBeFocused();
    await authenticatedPage.keyboard.type("watch with the lights off");
    await expect(note).toHaveValue("watch with the lights off");
  });

  test("deleting a linked binge returns home without asking for it again", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let deleted = false;
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([latest, older], {
          canCurate: true,
          curatorName: "the night shift",
        }),
        DeleteBinge: deleteBingeResponse(),
      }),
    );
    await authenticatedPage.route(/UserService\/ListBinges/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          bingesResponse(deleted ? [latest] : [latest, older], {
            canCurate: true,
            curatorName: "the night shift",
          }),
        ),
      }),
    );
    const bingeRequestsAfterDelete: string[] = [];
    await authenticatedPage.route(/UserService\/GetBinge/, (route) => {
      if (!deleted) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(bingeResponse(older)),
        });
      }
      bingeRequestsAfterDelete.push(route.request().postData() ?? "");
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ code: "not_found", message: "binge not found" }),
      });
    });

    await authenticatedPage.goto("/?binge=binge-older");
    const section = bingeSection(authenticatedPage);
    await expect(section.getByRole("heading", { name: "Comfort rewatches" })).toBeVisible();
    await section.getByRole("button", { name: "Edit this binge" }).click();
    const editor = authenticatedPage.getByRole("dialog");
    await editor.getByRole("button", { name: "delete" }).click();
    const remove = authenticatedPage.waitForRequest(/UserService\/DeleteBinge/);
    deleted = true;
    await editor.getByRole("button", { name: "really delete" }).click();
    await remove;

    await expect(editor).toHaveCount(0);
    expect(new URL(authenticatedPage.url()).search).toBe("");
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toBeVisible();
    await expect(section.getByRole("button", { name: /Comfort rewatches/ })).toHaveCount(0);
    await expect(authenticatedPage.getByRole("alert")).toHaveCount(0);
    expect(bingeRequestsAfterDelete).toEqual([]);
  });

  test("shows the engine's reason when a binge is rejected", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([], { canCurate: true, curatorName: "the night shift" }),
      }),
    );
    await authenticatedPage.route(/UserService\/CreateBinge/, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          code: "invalid_argument",
          message: "binge items could not be resolved: tt9999999",
        }),
      }),
    );

    await authenticatedPage.goto("/");
    await bingeSection(authenticatedPage).getByRole("button", { name: "new binge" }).click();
    const editor = authenticatedPage.getByRole("dialog");
    await editor.getByLabel("title", { exact: true }).fill("Broken");
    await editor.getByLabel("add a title").fill("tt9999999");
    await editor.getByLabel("add a title").press("Enter");
    await editor.getByRole("button", { name: "publish binge" }).click();

    await expect(editor.getByRole("alert")).toHaveText(
      "binge items could not be resolved: tt9999999",
    );
    await expect(editor.getByLabel("title", { exact: true })).toHaveValue("Broken");
  });

  test("a failed background refresh keeps the open editor and its draft", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      appScenarioMethods({ SetBingeCuratorName: setBingeCuratorNameResponse("Night Shift") }),
    );
    const listCalls = await routeInSequence(authenticatedPage, "ListBinges", [
      bingesResponse([latest], { canCurate: true }),
      connectError(500, "internal", "binges are down"),
    ]);
    await authenticatedPage.route(/UserService\/CreateBinge/, (route) =>
      route.fulfill(connectError(400, "invalid_argument", "binge items could not be resolved")),
    );

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    await section.getByRole("button", { name: "new binge" }).click();
    const editor = authenticatedPage.getByRole("dialog");
    await editor.getByLabel("your curator name").fill("Night Shift");
    await editor.getByLabel("title", { exact: true }).fill("Keep me");
    await editor.getByLabel("add a title").fill("tt9000001");
    await editor.getByLabel("add a title").press("Enter");

    const refreshFailed = authenticatedPage.waitForResponse(
      (response) => /UserService\/ListBinges/.test(response.url()) && response.status() === 500,
    );
    await editor.getByRole("button", { name: "publish binge" }).click();
    await refreshFailed;

    await expect(editor.getByRole("alert")).toHaveText("binge items could not be resolved");
    expect(listCalls()).toBe(2);
    await expect(editor.getByLabel("title", { exact: true })).toHaveValue("Keep me");
    await expect(editor.locator('[data-slot="binge-editor-item"]')).toHaveCount(1);
    await editor.getByRole("button", { name: "cancel" }).click();
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toBeVisible();
  });

  test("tells a curator when their name is already taken", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([], { canCurate: true }) }));
    await authenticatedPage.route(/UserService\/SetBingeCuratorName/, (route) =>
      route.fulfill(connectError(409, "already_exists", "curator name is taken")),
    );

    await authenticatedPage.goto("/");
    await bingeSection(authenticatedPage).getByRole("button", { name: "new binge" }).click();
    const editor = authenticatedPage.getByRole("dialog");
    const name = editor.getByLabel("your curator name");
    await name.fill("the night shift");
    await editor.getByLabel("title", { exact: true }).fill("Mine");
    await editor.getByLabel("add a title").fill("tt9000001");
    await editor.getByLabel("add a title").press("Enter");
    await editor.getByRole("button", { name: "publish binge" }).click();

    await expect(editor.getByText("that name is already taken")).toBeVisible();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(editor.getByRole("alert")).toHaveCount(0);

    await name.fill("the day shift");
    await expect(editor.getByText("that name is already taken")).toHaveCount(0);
  });
});
