import type { Page, Route } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import { downloadFolderResponse, folderResponse, userFile } from "./support/seeds";

const credential = "fixture-credential";
const manifestUrl = `https://stremio.chill.institute/s/${credential}/manifest.json`;
const maskedUrl = "stremio.chill.institute/s/••••/manifest.json";
const root = userFile({ id: 0n, name: "your files" });

function folderMethods(folder = root) {
  return {
    GetDownloadFolder: downloadFolderResponse(folder),
    GetFolder: folderResponse(root, [
      userFile({ id: 1n, name: "Movies" }),
      userFile({ id: 2n, name: "TV Shows" }),
    ]),
  };
}

type EngineRequest = { path: string; auth: string | undefined; body: string | null };

async function routeEngine(page: Page, handle: (route: Route, path: string) => Promise<void>) {
  const requests: EngineRequest[] = [];
  await page.route("https://api.chill.institute/stremio/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    expect(request.method()).toBe("POST");
    requests.push({ path, auth: request.headers().authorization, body: request.postData() });
    await handle(route, path);
  });
  return requests;
}

async function stubClipboard(page: Page, fails = false) {
  await page.addInitScript((shouldFail) => {
    let copied = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          if (shouldFail) throw new Error("Fixture clipboard denied");
          copied = text;
        },
        readText: async () => copied,
      },
    });
  }, fails);
}

test("gets a masked add-on link, copies it and keeps it out of storage, URLs and reports", async ({
  authenticatedPage: page,
  mockRpc,
  sentryEnvelopes,
}) => {
  await mockRpc(folderMethods());
  const requests = await routeEngine(page, (route) => route.fulfill({ json: { credential } }));
  await stubClipboard(page);
  await page.goto("/stremio");
  await expect(page.getByText("your files", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "get add-on link" }).click();

  await expect(page.getByRole("link", { name: "install chill" })).toHaveAttribute(
    "href",
    `stremio://stremio.chill.institute/s/${credential}/manifest.json`,
  );
  const link = page.getByRole("textbox", { name: "Add-on link" });
  await expect(link).toHaveValue(maskedUrl);
  await expect(page.getByText(credential)).toHaveCount(0);
  await expect(page.getByText("This link is shown once.")).toBeVisible();

  await page.getByRole("button", { name: "copy link" }).click();
  await expect(page.getByRole("status")).toContainText("Keep it private");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(manifestUrl);
  await expect(link).toHaveValue(maskedUrl);

  await page.getByRole("button", { name: "show link" }).click();
  await expect(link).toHaveValue(manifestUrl);
  await page.getByRole("button", { name: "hide link" }).click();
  await expect(link).toHaveValue(maskedUrl);

  expect(requests).toEqual([
    { path: "/stremio/credential", auth: "Bearer test-token", body: "{}" },
  ]);
  const stored = await page.evaluate(() =>
    JSON.stringify([
      Object.entries(localStorage),
      Object.entries(sessionStorage),
      location.href,
      document.cookie,
    ]),
  );
  expect(stored).not.toContain(credential);
  expect(sentryEnvelopes.join("\n")).not.toContain(credential);
});

test("gets a link for a chosen folder", async ({ authenticatedPage: page, mockRpc }) => {
  await mockRpc(folderMethods());
  const requests = await routeEngine(page, (route) => route.fulfill({ json: { credential } }));
  await page.goto("/stremio");
  await page.getByRole("button", { name: "change download folder" }).click();
  await page.getByRole("button", { name: "Open folder TV Shows" }).click();
  await page.getByRole("button", { name: "Use TV Shows as download folder" }).click();
  await expect(page.getByRole("dialog", { name: "choose download folder" })).toBeHidden();
  await expect(page.getByTitle("TV Shows", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "get add-on link" }).click();
  await expect(page.getByRole("link", { name: "install chill" })).toBeVisible();
  expect(requests.map((request) => request.body)).toEqual(['{"folder_id":"2"}']);
});

test("reveals and selects the link when copying fails", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc(folderMethods());
  await routeEngine(page, (route) => route.fulfill({ json: { credential } }));
  await stubClipboard(page, true);
  await page.goto("/stremio");
  await page.getByRole("button", { name: "get add-on link" }).click();
  await page.getByRole("button", { name: "copy link" }).click();
  await expect(page.getByRole("status")).toContainText("copy it manually");
  const link = page.getByRole("textbox", { name: "Add-on link" });
  await expect(link).toBeFocused();
  expect(
    await link.evaluate((element: HTMLInputElement) =>
      element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
    ),
  ).toBe(manifestUrl);
});

for (const { name, response, message } of [
  {
    name: "a missing download folder",
    response: { status: 409, json: { code: "download_folder_missing", message: "x" } },
    message: "Pick a download folder first.",
  },
  {
    name: "an unconfigured add-on",
    response: { status: 503, json: { code: "stremio_not_configured", message: "x" } },
    message: "isn't available yet",
  },
  {
    name: "an expired session",
    response: { status: 401, json: { code: "unauthenticated", message: "x" } },
    message: "Session expired",
  },
  { name: "a network failure", response: null, message: "Couldn't reach chill.institute" },
]) {
  test(`explains ${name} and allows a retry`, async ({ authenticatedPage: page, mockRpc }) => {
    await mockRpc(folderMethods());
    let attempts = 0;
    await routeEngine(page, async (route) => {
      attempts += 1;
      if (attempts > 1) await route.fulfill({ json: { credential } });
      else if (response) await route.fulfill(response);
      else await route.abort("internetdisconnected");
    });
    await page.goto("/stremio");
    await page.getByRole("button", { name: "get add-on link" }).click();
    await expect(page.getByRole("alert")).toContainText(message);
    if (response?.status === 401) {
      await expect(page.getByRole("button", { name: "sign in again" })).toBeVisible();
    }
    await page.getByRole("button", { name: "get add-on link" }).click();
    await expect(page.getByRole("link", { name: "install chill" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("shows no folder selected with a choose action", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc({ ...folderMethods(), GetDownloadFolder: downloadFolderResponse() });
  await page.goto("/stremio");
  await expect(page.getByText("no folder selected")).toBeVisible();
  await expect(page.getByRole("button", { name: "choose download folder" })).toBeVisible();
});

test("disconnects after confirmation and recovers from a failed attempt", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockRpc(folderMethods());
  let disconnects = 0;
  const pending = Promise.withResolvers<void>();
  const requests = await routeEngine(page, async (route, path) => {
    if (path === "/stremio/credential") {
      await route.fulfill({ json: { credential } });
      return;
    }
    disconnects += 1;
    if (disconnects === 1) {
      await route.fulfill({ status: 503, json: { code: "unavailable", message: "x" } });
      return;
    }
    await pending.promise;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/stremio");
  await page.getByRole("button", { name: "get add-on link" }).click();
  await expect(page.getByRole("link", { name: "install chill" })).toBeVisible();

  const open = page.getByRole("button", { name: "disconnect Stremio" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Disconnect Stremio?" });
  await expect(dialog).toContainText("every device");
  await expect(dialog).toContainText("The website and CLI stay signed in.");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  expect(disconnects).toBe(0);

  await open.click();
  await dialog.getByRole("button", { name: "disconnect", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("isn't available yet");
  await dialog.getByRole("button", { name: "disconnect", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "disconnecting…" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "cancel" })).toBeDisabled();
  pending.resolve();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("Disconnected");
  await expect(page.getByRole("link", { name: "install chill" })).toHaveCount(0);
  expect(requests.filter((request) => request.path === "/stremio/disconnect")).toEqual([
    { path: "/stremio/disconnect", auth: "Bearer test-token", body: null },
    { path: "/stremio/disconnect", auth: "Bearer test-token", body: null },
  ]);
});

test("redirects signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/stremio");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("button", { name: "get add-on link" })).toHaveCount(0);
});
