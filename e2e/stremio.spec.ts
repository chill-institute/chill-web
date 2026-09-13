import { test, expect } from "./support/fixtures";

const manifestUrl = "https://stremio.chill.institute/addons/fixture-capability/manifest.json";
const installation = { id: "fixture-id", folderId: "0", createdAt: 1_789_300_000_000, manifestUrl };

test("creates, copies and revokes a private add-on without putting the chill token in URLs", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc({ GetFolder: { parent: { id: "0", name: "Your Files" }, files: [] } });
  const requests: { method: string; url: string; auth: string | undefined }[] = [];
  await page.route("https://stremio.chill.institute/api/installations**", async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      url: request.url(),
      auth: request.headers().authorization,
    });
    if (request.method() === "GET") await route.fulfill({ json: { installations: [] } });
    else if (request.method() === "POST") {
      expect(request.postDataJSON()).toEqual({ folderId: "0" });
      await route.fulfill({ status: 201, json: installation });
    } else await route.fulfill({ status: 204 });
  });
  await page.addInitScript(() => {
    let copied = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          copied = text;
        },
        readText: async () => copied,
      },
    });
  });
  await page.goto("/stremio");
  await expect(page.getByText("No add-ons yet.")).toBeVisible();
  await page.getByRole("button", { name: "create add-on", exact: true }).click();
  await expect(page.getByRole("link", { name: "install in Stremio" })).toHaveAttribute(
    "href",
    "stremio://stremio.chill.institute/addons/fixture-capability/manifest.json",
  );
  await page.getByRole("button", { name: "copy link" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(manifestUrl);
  await page.getByRole("button", { name: "revoke", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Revoke this add-on?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("link", { name: "install in Stremio" })).toBeVisible();
  await page.getByRole("button", { name: "revoke", exact: true }).click();
  await dialog.getByRole("button", { name: "revoke add-on" }).click();
  await expect(page.getByRole("status")).toContainText("Add-on revoked");
  await expect(page.getByRole("link", { name: "install in Stremio" })).toHaveCount(0);
  expect(requests.map((request) => request.method)).toEqual(["GET", "POST", "DELETE"]);
  expect(
    requests.every(
      (request) => request.auth === "Bearer test-token" && !request.url.includes("test-token"),
    ),
  ).toBe(true);
});

test("shows a reconnect action for an expired session", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc({ GetFolder: { parent: { id: "0", name: "Your Files" }, files: [] } });
  await page.route("https://stremio.chill.institute/api/installations", (route) =>
    route.fulfill({ status: 401, json: { error: { code: "unauthenticated" } } }),
  );
  await page.goto("/stremio");
  await expect(page.getByRole("button", { name: /sign in again/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "create add-on", exact: true })).toBeDisabled();
});

test("acquisition requires confirmation and recovers the submitted operation after reload", async ({
  authenticatedPage: page,
}) => {
  let sends = 0;
  const operation = { id: "operation-id", state: "submitted", transferId: "transfer-id" };
  await page.route(
    "https://stremio.chill.institute/api/installations/fixture-id/**",
    async (route) => {
      const request = route.request();
      expect(request.headers().authorization).toBe("Bearer test-token");
      expect(request.url()).not.toContain("test-token");
      if (request.url().includes("/releases?")) {
        await route.fulfill({
          json: {
            releases: [
              {
                id: "release-id",
                title: "Fixture movie 1080p",
                indexer: "fixture",
                size: "1024",
                seeders: "10",
              },
            ],
            ...(sends ? { operation } : {}),
          },
        });
      } else if (request.method() === "POST") {
        sends++;
        expect(request.postDataJSON()).toEqual({
          type: "movie",
          target: "chill:movie:fixture",
          releaseId: "release-id",
        });
        await route.fulfill({ json: operation });
      } else
        await route.fulfill({
          json: {
            ...operation,
            transfer: { name: "Fixture movie", status: "COMPLETED", percentDone: 100 },
            files: [
              { id: "1", name: "Fixture movie.mp4", stremioId: "chill:acquired:operation-id:1" },
            ],
          },
        });
    },
  );
  await page.goto(
    "/stremio/acquire?installation=fixture-id&type=movie&target=chill%3Amovie%3Afixture",
  );
  await page.getByRole("radio").check();
  expect(sends).toBe(0);
  await page.getByRole("button", { name: "confirm and send to put.io" }).click();
  await expect(page.getByRole("link", { name: "Fixture movie.mp4" })).toHaveAttribute(
    "href",
    "https://web.stremio.com/#/detail/movie/chill%3Aacquired%3Aoperation-id%3A1",
  );
  await page.reload();
  await expect(page.getByRole("link", { name: "Fixture movie.mp4" })).toBeVisible();
  expect(sends).toBe(1);
  await expect(page.getByRole("button", { name: "confirm and send to put.io" })).toHaveCount(0);
});

test("uncertain acquisition never retries a transfer automatically", async ({
  authenticatedPage: page,
}) => {
  let sends = 0;
  await page.route(
    "https://stremio.chill.institute/api/installations/fixture-id/**",
    async (route) => {
      if (route.request().method() === "POST") {
        sends++;
        await route.abort("failed");
      } else if (route.request().url().includes("/releases?"))
        await route.fulfill({
          json: {
            releases: [
              {
                id: "release-id",
                title: "Fixture movie",
                indexer: "fixture",
                size: "1024",
                seeders: "10",
              },
            ],
          },
        });
    },
  );
  await page.goto(
    "/stremio/acquire?installation=fixture-id&type=movie&target=chill%3Amovie%3Afixture",
  );
  await page.getByRole("radio").check();
  await page.getByRole("button", { name: "confirm and send to put.io" }).click();
  await expect(
    page.getByText("The request may have been accepted.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "check request status" }).click();
  await expect(page.getByRole("button", { name: "confirm and send to put.io" })).toBeDisabled();
  expect(sends).toBe(1);
});
