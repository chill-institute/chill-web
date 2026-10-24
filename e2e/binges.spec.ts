import { expect, test } from "./support/fixtures";
import { appScenarioMethods } from "./support/app-scenarios";
import {
  binge,
  bingeItem,
  bingeResponse,
  bingesResponse,
  createBingeResponse,
  deleteBingeResponse,
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
    await expect(section.getByRole("heading", { name: "Signals in the dark" })).toBeVisible();
    await expect(section.getByText("Three nights of quiet dread")).toBeVisible();
    await expect(section.locator('[data-slot="binge-item"]')).toHaveCount(2);
    await expect(section.getByText("start here, no spoilers")).toBeVisible();
    await expect(section.getByText("season one only")).toBeVisible();
    await expect(section.getByRole("button", { name: "other binges" })).toHaveCount(0);
    await expect(section.getByRole("button", { name: "new binge" })).toHaveCount(0);
    await expect(section.getByRole("button", { name: "Edit this binge" })).toHaveCount(0);
  });

  test("stays out of the way when there are no binges", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([]) }));

    await authenticatedPage.goto("/");

    await expect(authenticatedPage.locator("#search-global")).toBeVisible();
    await expect(bingeSection(authenticatedPage)).toHaveCount(0);
  });

  test("switches to another binge from the picker and deep links to it", async ({
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
    await section.getByRole("button", { name: "other binges" }).click();

    const picker = authenticatedPage.getByRole("dialog");
    await expect(picker.getByRole("button", { name: /Signals in the dark/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await picker.getByRole("button", { name: /Comfort rewatches/ }).click();

    await authenticatedPage.waitForURL("**/?binge=binge-older");
    await expect(picker).toHaveCount(0);
    await expect(section.getByRole("heading", { name: "Comfort rewatches" })).toBeVisible();
    await expect(section.locator('[data-slot="binge-item"]')).toHaveCount(1);

    await authenticatedPage.reload();
    await expect(
      bingeSection(authenticatedPage).getByRole("heading", { name: "Comfort rewatches" }),
    ).toBeVisible();
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
        CreateBinge: createBingeResponse(published),
        GetBinge: bingeResponse(published),
      }),
    );

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    await expect(section.getByText("no binges yet")).toBeVisible();
    await section.getByRole("button", { name: "new binge" }).click();

    const editor = authenticatedPage.getByRole("dialog");
    await editor.getByRole("button", { name: "publish binge" }).click();
    await expect(editor.getByText("give the binge a title")).toBeVisible();
    await expect(editor.getByText("add at least one title")).toBeVisible();

    await editor.getByLabel("title", { exact: true }).fill("Fresh binge");
    await editor.getByLabel("blurb", { exact: true }).fill("Just added.");
    await editor.getByLabel("IMDb id 1").fill("not an id");
    await editor.getByRole("button", { name: "publish binge" }).click();
    await expect(editor.getByText("needs an IMDb title id like tt0903747")).toBeVisible();

    await editor.getByLabel("IMDb id 1").fill("https://www.imdb.com/title/tt9000001/");
    await editor.getByLabel("comment 1").fill("start here");
    await editor.getByRole("button", { name: "add title" }).click();
    await editor.getByLabel("IMDb id 2").fill("TT9000003");

    const request = authenticatedPage.waitForRequest(/UserService\/CreateBinge/);
    await editor.getByRole("button", { name: "publish binge" }).click();
    expect((await request).postDataJSON()).toEqual({
      title: "Fresh binge",
      blurb: "Just added.",
      items: [{ imdbId: "tt9000001", comment: "start here" }, { imdbId: "tt9000003" }],
    });

    await authenticatedPage.waitForURL("**/?binge=binge-new");
    await expect(editor).toHaveCount(0);
    await expect(section.getByRole("heading", { name: "Fresh binge" })).toBeVisible();
  });

  test("a curator edits and deletes the shown binge", async ({ authenticatedPage, mockRpc }) => {
    const renamed = binge({ title: "Signals in the dark, revisited" });
    await mockRpc(
      appScenarioMethods({
        ListBinges: bingesResponse([latest], { canCurate: true }),
        GetBinge: bingeResponse(renamed),
        UpdateBinge: updateBingeResponse(renamed),
        DeleteBinge: deleteBingeResponse(),
      }),
    );

    await authenticatedPage.goto("/");
    const section = bingeSection(authenticatedPage);
    await section.getByRole("button", { name: "Edit this binge" }).click();

    const editor = authenticatedPage.getByRole("dialog");
    await expect(editor.getByLabel("title", { exact: true })).toHaveValue("Signals in the dark");
    await expect(editor.getByLabel("IMDb id 2")).toHaveValue("tt9000003");
    await expect(editor.getByLabel("comment 2")).toHaveValue("season one only");

    await editor.getByRole("button", { name: "remove title 2" }).click();
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
    await mockRpc(appScenarioMethods({ ListBinges: bingesResponse([], { canCurate: true }) }));
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
    await editor.getByLabel("IMDb id 1").fill("tt9999999");
    await editor.getByRole("button", { name: "publish binge" }).click();

    await expect(editor.getByRole("alert")).toHaveText(
      "binge items could not be resolved: tt9999999",
    );
    await expect(editor.getByLabel("title", { exact: true })).toHaveValue("Broken");
  });
});
