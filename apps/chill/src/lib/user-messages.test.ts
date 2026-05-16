import { describe, expect, it } from "vite-plus/test";

import {
  DISMISSED_MESSAGES_STORAGE_KEY,
  dismissUserMessage,
  getNextUserMessage,
  getUserMessageActionHref,
  getVisibleUserMessages,
  markUserMessageDismissed,
  readDismissedUserMessages,
  writeDismissedUserMessages,
} from "./user-messages";

function createStorage(seed: Record<string, string> = {}): Storage {
  let data = { ...seed };
  return {
    get length() {
      return Object.keys(data).length;
    },
    clear() {
      data = {};
    },
    getItem(key) {
      return data[key] ?? null;
    },
    key(index) {
      return Object.keys(data)[index] ?? null;
    },
    removeItem(key) {
      delete data[key];
    },
    setItem(key, value) {
      data[key] = value;
    },
  };
}

const message = {
  id: "test-message",
  surface: "modal" as const,
  priority: 100,
  badge: "new",
  title: "Test message",
  description: "A test message.",
  body: ["A useful update."],
  primaryAction: {
    label: "Open",
    href: "https://example.com",
  },
  dismissLabel: "Dismiss",
};

describe("getNextUserMessage", () => {
  it("returns the first visible message", () => {
    expect(getNextUserMessage({ dismissed: {}, messages: [message] })).toBe(message);
  });

  it("skips dismissed messages", () => {
    expect(
      getNextUserMessage({
        dismissed: { "test-message": "2026-05-16T00:00:00.000Z" },
        messages: [message],
      }),
    ).toBeNull();
  });

  it("respects message windows", () => {
    const scheduled = {
      ...message,
      startsAt: "2026-05-17T00:00:00.000Z",
      endsAt: "2026-05-18T00:00:00.000Z",
    };

    expect(
      getNextUserMessage({
        dismissed: {},
        messages: [scheduled],
        now: new Date("2026-05-16T00:00:00.000Z"),
      }),
    ).toBeNull();
    expect(
      getNextUserMessage({
        dismissed: {},
        messages: [scheduled],
        now: new Date("2026-05-17T12:00:00.000Z"),
      }),
    ).toBe(scheduled);
    expect(
      getNextUserMessage({
        dismissed: {},
        messages: [scheduled],
        now: new Date("2026-05-19T00:00:00.000Z"),
      }),
    ).toBeNull();
  });
});

describe("getVisibleUserMessages", () => {
  it("orders visible messages by priority", () => {
    const higherPriority = { ...message, id: "higher-priority", priority: 200 };

    expect(
      getVisibleUserMessages({
        dismissed: {},
        messages: [message, higherPriority],
      }).map((visibleMessage) => visibleMessage.id),
    ).toEqual(["higher-priority", "test-message"]);
  });

  it("filters by surface", () => {
    const bannerMessage = { ...message, id: "banner-message", surface: "banner" as const };

    expect(
      getVisibleUserMessages({
        dismissed: {},
        messages: [message, bannerMessage],
        surface: "modal",
      }).map((visibleMessage) => visibleMessage.id),
    ).toEqual(["test-message"]);
  });
});

describe("dismissed user messages storage", () => {
  it("reads empty state when nothing is stored", () => {
    expect(readDismissedUserMessages(createStorage())).toEqual({});
  });

  it("ignores corrupted storage", () => {
    const storage = createStorage({ [DISMISSED_MESSAGES_STORAGE_KEY]: "nope" });

    expect(readDismissedUserMessages(storage)).toEqual({});
  });

  it("records dismissal timestamps", () => {
    const storage = createStorage();

    expect(
      dismissUserMessage("test-message", storage, new Date("2026-05-16T12:00:00.000Z")),
    ).toEqual({ "test-message": "2026-05-16T12:00:00.000Z" });
    expect(readDismissedUserMessages(storage)).toEqual({
      "test-message": "2026-05-16T12:00:00.000Z",
    });
  });

  it("builds and writes minimal dismissal state", () => {
    const storage = createStorage();
    const dismissed = markUserMessageDismissed(
      {},
      "test-message",
      new Date("2026-05-16T12:00:00.000Z"),
    );

    writeDismissedUserMessages(dismissed, storage);

    expect(readDismissedUserMessages(storage)).toEqual({
      "test-message": "2026-05-16T12:00:00.000Z",
    });
  });
});

describe("getUserMessageActionHref", () => {
  it("returns plain action hrefs by default", () => {
    expect(getUserMessageActionHref(message, "token")).toBe("https://example.com");
  });

  it("builds a fragment handoff url for institute token handoff actions", () => {
    const handoffMessage = {
      ...message,
      primaryAction: {
        ...message.primaryAction,
        href: "https://binge.institute",
        handoffAuthToken: true,
      },
    };

    expect(getUserMessageActionHref(handoffMessage, "token with space")).toBe(
      "https://binge.institute/auth/handoff#auth_token=token+with+space",
    );
  });

  it("keeps non-institute token handoff action hrefs plain", () => {
    const handoffMessage = {
      ...message,
      primaryAction: {
        ...message.primaryAction,
        handoffAuthToken: true,
      },
    };

    expect(getUserMessageActionHref(handoffMessage, "token")).toBe("https://example.com");
  });
});
