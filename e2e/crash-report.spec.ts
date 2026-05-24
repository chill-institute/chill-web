import { test, expect } from "./support/fixtures";
import { userSettings } from "./support/seeds";

test.describe("crash report fallback", () => {
  test("local crash fallback lets the user copy a report", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
    });

    await authenticatedPage.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            (window as Window & { __copiedReport?: string }).__copiedReport = value;
          },
        },
      });
    });

    await authenticatedPage.goto("/debug/crash");

    await expect(
      authenticatedPage.getByRole("heading", { name: "Something went wrong." }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(
        "The app hit a crash. Crash reporting is not configured for this build.",
      ),
    ).toBeVisible();
    await expect(authenticatedPage.getByText("Sentry event:")).toHaveCount(0);

    await authenticatedPage.getByLabel("What were you doing?").fill("I opened the home page.");
    await authenticatedPage.getByRole("button", { name: "copy report" }).click();

    const copiedReport = await authenticatedPage.evaluate(
      () => (window as Window & { __copiedReport?: string }).__copiedReport ?? "",
    );

    expect(copiedReport).toContain('"routePath": "/debug/crash"');
    expect(copiedReport).toContain(
      '"message": "Intentional debug crash for the local error fallback."',
    );
    expect(copiedReport).toContain('"notes": "I opened the home page."');
  });

  test("local crash fallback does not suggest public GitHub issues", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
    });

    await authenticatedPage.goto("/debug/crash");

    await expect(authenticatedPage.getByRole("link", { name: "create GitHub issue" })).toHaveCount(
      0,
    );
    await expect(authenticatedPage.getByRole("button", { name: "copy report" })).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: "reload page" })).toBeVisible();
    await expect(authenticatedPage.getByText("Message:").locator("xpath=..")).toContainText(
      "Intentional debug crash for the local error fallback.",
    );
  });
});
