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

function bingeSection(page: import("@playwright/test").Page) {
  return page.locator('[data-slot="binge-section"]');
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
    await expect(section.getByText("by the night shift")).toBeVisible();
    await expect(section.getByText("Three nights of quiet dread")).toBeVisible();
    await expect(section.locator('[data-slot="binge-item"]')).toHaveCount(2);
    await expect(section.getByText("start here, no spoilers")).toBeVisible();
    await expect(section.getByText("season one only")).toBeVisible();
    await expect(section.locator('[data-slot="earlier-binges"]')).toHaveCount(0);
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

  test("lists earlier binges and deep links to them", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([latest, older]),
        GetBinge: bingeResponse(older),
      }),
    );

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    const earlier = section.locator('[data-slot="earlier-binges"]');
    await expect(earlier.getByText("earlier binges")).toBeVisible();
    await expect(earlier.getByRole("button")).toHaveCount(1);
    await expect(earlier.getByRole("button", { name: /Comfort rewatches/ })).toContainText(
      "by the night shift · 1 title",
    );
    await earlier.getByRole("button", { name: /Comfort rewatches/ }).click();

    await authenticatedPage.waitForURL("**/?binge=binge-older");
    await expect(section.getByRole("heading", { name: "Comfort rewatches" })).toBeVisible();
    await expect(section.locator('[data-slot="binge-item"]')).toHaveCount(1);
    await expect(earlier.getByText("other binges")).toBeVisible();
    await expect(earlier.getByRole("button", { name: /Signals in the dark/ })).toContainText(
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
    const earlier = section.locator('[data-slot="earlier-binges"]');
    await expect(
      earlier.getByRole("button", { name: /Comfort rewatches|Slow cinema/ }),
    ).toHaveCount(2);

    await section.getByRole("link", { name: "the night shift" }).first().click();
    await authenticatedPage.waitForURL(/curator=the(\+|%20)night(\+|%20)shift/);
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toHaveCount(0);
    await expect(earlier.getByText("binges by the night shift")).toBeVisible();
    await expect(earlier.getByRole("button", { name: /Signals in the dark/ })).toBeVisible();
    await expect(earlier.getByRole("button", { name: /Comfort rewatches/ })).toBeVisible();
    await expect(earlier.getByRole("button", { name: /Slow cinema/ })).toHaveCount(0);

    await earlier.getByRole("button", { name: "all binges" }).click();
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toBeVisible();

    await earlier.getByRole("link", { name: "late reels" }).click();
    await expect(earlier.getByText("binges by late reels")).toBeVisible();
    await expect(earlier.getByRole("button")).toHaveCount(2);

    await earlier.getByRole("button", { name: /Slow cinema/ }).click();
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

    await expect(bingeSection(authenticatedPage).getByRole("button")).toHaveCount(2);
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
        ListBinges: bingesResponse([latest], { canCurate: true, curatorName: "the night shift" }),
        GetBinge: bingeResponse(renamed),
        UpdateBinge: updateBingeResponse(renamed),
        DeleteBinge: deleteBingeResponse(),
      }),
    );

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

    await section.getByRole("button", { name: "Edit this binge" }).click();
    await editor.getByRole("button", { name: "delete" }).click();
    const remove = authenticatedPage.waitForRequest(/UserService\/DeleteBinge/);
    await editor.getByRole("button", { name: "really delete" }).click();
    expect((await remove).postDataJSON()).toEqual({ id: "binge-latest" });
    await expect(editor).toHaveCount(0);
    expect(new URL(authenticatedPage.url()).search).toBe("");
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
});
