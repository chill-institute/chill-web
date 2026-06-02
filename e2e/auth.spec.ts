import { test, expect } from "./support/fixtures";

test.describe("sign-in page", () => {
  test("shows access denied error with learn more action", async ({ page }) => {
    await page.goto("/sign-in?error=AccessDenied");

    await expect(page.getByText("needs an active put.io membership")).toBeVisible();
    await expect(page.getByRole("button", { name: "learn more" })).toBeVisible();
    await expect(page.getByRole("button", { name: "try again" })).toBeVisible();
  });

  test("shows session expired error with sign in again action", async ({ page }) => {
    await page.goto("/sign-in?error=SessionExpired");

    await expect(page.getByText("your session expired")).toBeVisible();
    await expect(page.getByRole("button", { name: "sign in again" })).toBeVisible();
  });

  test("shows put.io verification failure with retry and help actions", async ({ page }) => {
    await page.goto("/sign-in?error=PutioVerificationFailed");

    await expect(page.getByText("did not confirm an active account")).toBeVisible();
    await expect(page.getByRole("button", { name: "learn more" })).toBeVisible();
    await expect(page.getByRole("button", { name: "try again" })).toBeVisible();
  });

  for (const [errorCode, expectedMessage] of [
    ["OAuthDenied", "put.io sign-in was cancelled"],
    ["AuthFlowExpired", "that sign-in link expired"],
    ["OAuthExchangeFailed", "put.io did not finish the sign-in handshake"],
    ["PutioUnavailable", "we could not reach put.io"],
  ] as const) {
    test(`shows ${errorCode} callback failure message`, async ({ page }) => {
      await page.goto(`/sign-in?error=${errorCode}`);

      await expect(page.getByText(expectedMessage)).toBeVisible();
      await expect(page.getByRole("button", { name: "try again" })).toBeVisible();
    });
  }

  test("shows generic error for unknown error type", async ({ page }) => {
    await page.goto("/sign-in?error=SomethingWrong");

    await expect(page.getByText("something went sideways while signing you in")).toBeVisible();
    await expect(page.getByRole("button", { name: "try again" })).toBeVisible();
  });

  test("shows sign-in button when no error", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByRole("button", { name: "sign in with put.io" })).toBeVisible();
  });

  test("rejects /auth/success token planted via phishing link with no stored nonce", async ({
    page,
  }) => {
    await page.goto("/auth/success?nonce=planted-by-attacker#auth_token=attacker-issued-token");

    await page.waitForURL("**/sign-in**");
    expect(page.url()).toContain("error=UnknownError");
    const storedToken = await page.evaluate(() => window.localStorage.getItem("chill.auth_token"));
    expect(storedToken).toBeNull();
  });

  test("authenticate-at-put.io click propagates a well-formed nonce into the OAuth start URL", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // Fulfill rather than abort — aborted top-level navs leave the page in a state where sessionStorage and follow-up evaluates fail.
    await page.route(/\/auth\/putio\/start/, (route) => route.fulfill({ status: 200, body: "" }));

    const requestPromise = page.waitForRequest(/\/auth\/putio\/start/);
    await page.getByRole("button", { name: "sign in with put.io" }).click();
    const startURL = (await requestPromise).url();

    const successURL = new URL(startURL).searchParams.get("success_url");
    expect(successURL).not.toBeNull();
    const successNonce = new URL(successURL!).searchParams.get("nonce");
    expect(successNonce).toMatch(/^[0-9a-f]{32}$/);
  });

  test("authenticated user is redirected away from sign-in", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});
    await authenticatedPage.goto("/sign-in");

    await authenticatedPage.waitForURL("**/");
    expect(new URL(authenticatedPage.url()).pathname).toBe("/");
  });

  test("authenticated user returns to a callback route with search params", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});
    await authenticatedPage.goto("/sign-in?callbackUrl=%2Fsearch%3Fq%3Daurora");

    await authenticatedPage.waitForURL("**/search?q=aurora");
    const url = new URL(authenticatedPage.url());
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("aurora");
  });

  test("public sign-in error URLs do not clear an existing session", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});
    await authenticatedPage.goto("/sign-in?error=SomethingWrong");

    await expect(authenticatedPage.getByText("something went sideways")).toBeVisible();
    await authenticatedPage.goto("/settings");
    await expect(authenticatedPage.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("retrying a public sign-in error URL preserves an existing session", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});
    await authenticatedPage.goto("/sign-in?error=SomethingWrong");
    await authenticatedPage.route(/\/auth\/putio\/start/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    const requestPromise = authenticatedPage.waitForRequest(/\/auth\/putio\/start/);
    await authenticatedPage.getByRole("button", { name: "try again" }).click();
    await requestPromise;

    await authenticatedPage.goto("/settings");
    await expect(authenticatedPage.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("auth success returns to a stored search callback without router URL errors", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});
    await authenticatedPage.goto("/");
    await authenticatedPage.evaluate(() => {
      window.sessionStorage.setItem("chill.auth_nonce", "good-nonce");
      window.sessionStorage.setItem("chill.auth_callback", "/search?q=aurora");
    });

    await authenticatedPage.goto("/auth/success?nonce=good-nonce#auth_token=oauth-token");

    await authenticatedPage.waitForURL("**/search?q=aurora");
    const url = new URL(authenticatedPage.url());
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("aurora");
    await expect
      .poll(() => authenticatedPage.evaluate(() => window.localStorage.getItem("chill.auth_token")))
      .toBe("oauth-token");
  });

  test("auth success sends callback failures to sign-in UI", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.sessionStorage.setItem("chill.auth_nonce", "good-nonce");
      window.sessionStorage.setItem("chill.auth_callback", "/settings");
    });

    await page.goto(
      "/auth/success?nonce=good-nonce&error=PutioVerificationFailed&request_id=req-123",
    );

    await page.waitForURL("**/sign-in**");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("error")).toBe("PutioVerificationFailed");
    expect(url.searchParams.get("callbackUrl")).toBe("/settings");
    await expect(page.getByText("did not confirm an active account")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("chill.auth_token")))
      .toBeNull();
  });

  test("auth success failure shows the error instead of reusing an old token", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});
    await authenticatedPage.goto("/");
    await authenticatedPage.evaluate(() => {
      window.sessionStorage.setItem("chill.auth_nonce", "good-nonce");
      window.sessionStorage.setItem("chill.auth_callback", "/settings");
    });

    await authenticatedPage.goto("/auth/success?nonce=good-nonce&error=PutioVerificationFailed");

    await authenticatedPage.waitForURL("**/sign-in**");
    const url = new URL(authenticatedPage.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("error")).toBe("PutioVerificationFailed");
    await expect(authenticatedPage.getByText("did not confirm an active account")).toBeVisible();
    await expect
      .poll(() => authenticatedPage.evaluate(() => window.localStorage.getItem("chill.auth_token")))
      .toBeNull();

    await authenticatedPage.evaluate(() => {
      window.history.pushState(null, "", "/settings");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await authenticatedPage.waitForURL("**/sign-in**");
    expect(new URL(authenticatedPage.url()).pathname).toBe("/sign-in");

    await authenticatedPage.goto("/settings");
    await authenticatedPage.waitForURL("**/sign-in**");
    expect(new URL(authenticatedPage.url()).searchParams.get("callbackUrl")).toBe("/settings");
  });

  test("retrying a trusted callback failure returns to the stored callback after OAuth success", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});
    await authenticatedPage.goto("/");
    await authenticatedPage.evaluate(() => {
      window.sessionStorage.setItem("chill.auth_nonce", "good-nonce");
      window.sessionStorage.setItem("chill.auth_callback", "/settings");
    });

    await authenticatedPage.goto("/auth/success?nonce=good-nonce&error=PutioVerificationFailed");
    await authenticatedPage.waitForURL("**/sign-in**");
    expect(new URL(authenticatedPage.url()).searchParams.get("callbackUrl")).toBe("/settings");
    await authenticatedPage.route(/\/auth\/putio\/start/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    const requestPromise = authenticatedPage.waitForRequest(/\/auth\/putio\/start/);
    await authenticatedPage.getByRole("button", { name: "try again" }).click();
    const startURL = (await requestPromise).url();
    const successURL = new URL(startURL).searchParams.get("success_url");
    expect(successURL).not.toBeNull();

    await authenticatedPage.goto(`${successURL}#auth_token=retry-token`);

    await authenticatedPage.waitForURL("**/settings");
    await expect(authenticatedPage.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect
      .poll(() => authenticatedPage.evaluate(() => window.localStorage.getItem("chill.auth_token")))
      .toBe("retry-token");
  });
});

test.describe("CLI token page", () => {
  test("authenticated users can reveal and hide the token", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({});

    await authenticatedPage.goto("/auth/cli-token");

    await expect(authenticatedPage.getByRole("heading", { name: "CLI token" })).toBeVisible();

    const tokenInput = authenticatedPage.getByLabel("CLI auth token");
    await expect(tokenInput).toHaveValue("test-token");
    await expect(tokenInput).toHaveAttribute("type", "password");

    await authenticatedPage.getByRole("button", { name: "show" }).click();
    await expect(tokenInput).toHaveAttribute("type", "text");

    await authenticatedPage.getByRole("button", { name: "hide" }).click();
    await expect(tokenInput).toHaveAttribute("type", "password");
  });

  test("unauthenticated users are redirected to sign-in without storing auth-route callbacks", async ({
    page,
  }) => {
    await page.goto("/auth/cli-token");

    await page.waitForURL("**/sign-in**");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("callbackUrl")).toBeNull();
  });
});

test.describe("sign-out", () => {
  test("clears auth and redirects to sign-in", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({});
    await authenticatedPage.goto("/sign-out");

    await authenticatedPage.waitForURL("**/sign-in**");
    expect(authenticatedPage.url()).toContain("/sign-in");
  });

  test("passes error parameter through to sign-in", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({});
    await authenticatedPage.goto("/sign-out?error=SessionExpired");

    await authenticatedPage.waitForURL("**/sign-in**");
    expect(authenticatedPage.url()).toContain("error=SessionExpired");
  });
});
