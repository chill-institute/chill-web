import { test, expect } from "./support/fixtures";

const manifestUrl = "https://stremio.chill.institute/addons/fixture-capability/manifest.json";
const installation = { id: "fixture-id", folderId: "0", createdAt: 1_789_300_000_000, manifestUrl };

test("connects an account, copies its link and revokes its connection without putting the chill token in URLs", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc({});
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
      expect(request.postDataJSON()).toEqual({});
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
  await expect(
    page.getByText("Connect your account to get a private installation link."),
  ).toBeVisible();
  await page.getByRole("button", { name: "connect account", exact: true }).click();
  await expect(page.getByRole("link", { name: "install chill" })).toHaveAttribute(
    "href",
    "stremio://stremio.chill.institute/addons/fixture-capability/manifest.json",
  );
  await page.getByRole("button", { name: "copy link" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(manifestUrl);
  await page.getByRole("button", { name: "revoke", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Revoke this connection?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("link", { name: "install chill" })).toBeVisible();
  await page.getByRole("button", { name: "revoke", exact: true }).click();
  await dialog.getByRole("button", { name: "revoke connection" }).click();
  await expect(page.getByRole("status")).toContainText("Connection revoked");
  await expect(page.getByRole("link", { name: "install chill" })).toHaveCount(0);
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
  await mockRpc({});
  await page.route("https://stremio.chill.institute/api/installations", (route) =>
    route.fulfill({ status: 401, json: { error: { code: "unauthenticated" } } }),
  );
  await page.goto("/stremio");
  await expect(page.getByRole("button", { name: /sign in again/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "connect account", exact: true })).toBeDisabled();
});

test("retries connecting the whole library and disables duplicate submissions", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc({});
  let attempts = 0;
  const submissions: unknown[] = [];
  const pending = Promise.withResolvers<void>();
  await page.route("https://stremio.chill.institute/api/installations", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { installations: [] } });
      return;
    }
    submissions.push(route.request().postDataJSON());
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 503, json: {} });
      return;
    }
    await pending.promise;
    await route.fulfill({ status: 201, json: installation });
  });
  await page.goto("/stremio");
  await expect(page.getByRole("button", { name: "choose folder" })).toHaveCount(0);
  await expect(
    page.getByText("Browse videos across your put.io library, including subfolders."),
  ).toBeVisible();
  await page.getByRole("button", { name: "connect account", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "connect account", exact: true }).click();
  await expect(page.getByRole("button", { name: "connecting…" })).toBeDisabled();
  pending.resolve();
  await expect(page.getByRole("status")).toContainText("Account connected");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(submissions).toEqual([{}, {}]);
});

test("preserves folder-scoped connections with manual copy and keyboard revoke recovery", async ({
  authenticatedPage: page,
  mockRpc,
  sentryEnvelopes,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockRpc({});
  await page.route("https://stremio.chill.institute/api/installations**", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { installations: [{ ...installation, folderId: "42" }] } })
      : route.fulfill({ status: 503, json: {} }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Fixture clipboard denied");
        },
      },
    });
  });
  await page.goto("/stremio");
  await expect(page.getByRole("heading", { name: "Folder 42", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "copy link" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("copy it manually");
  const link = page.getByRole("textbox", { name: "Private installation link" });
  await link.focus();
  expect(
    await link.evaluate((element: HTMLInputElement) =>
      element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
    ),
  ).toBe(manifestUrl);
  const revoke = page.getByRole("button", { name: "revoke", exact: true });
  await revoke.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Revoke this connection?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(revoke).toBeFocused();
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "revoke connection" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("link", { name: "install chill" })).toBeVisible();
  expect(sentryEnvelopes.join("\n")).not.toContain(manifestUrl);
});

test("retries loading connections before enabling account connection", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc({});
  let attempts = 0;
  await page.route("https://stremio.chill.institute/api/installations", async (route) => {
    attempts += 1;
    await route.fulfill(
      attempts === 1 ? { status: 503, json: {} } : { json: { installations: [] } },
    );
  });
  await page.goto("/stremio");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "connect account", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "connect account", exact: true })).toBeEnabled();
});
