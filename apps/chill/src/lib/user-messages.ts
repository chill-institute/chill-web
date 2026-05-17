import { publicLinks } from "@chill-institute/ui/lib/public-links";
import { buildAuthHandoffURL } from "@chill-institute/auth/auth";

type UserMessageSurface = "modal" | "banner" | "toast";

export type UserMessage = {
  id: string;
  surface: UserMessageSurface;
  priority: number;
  badge: string;
  sender?: {
    name: string;
    banner?: string;
    avatarSrc?: string;
    avatarAlt?: string;
  };
  title: string;
  description: string;
  body: string[];
  primaryAction: {
    label: string;
    href: string;
    handoffAuthToken?: boolean;
  };
  dismissLabel: string;
  startsAt?: string;
  endsAt?: string;
};

export type StoredUserMessageState = Record<string, string>;

export type UserMessageSource = () => readonly UserMessage[] | Promise<readonly UserMessage[]>;

export const DISMISSED_MESSAGES_STORAGE_KEY = "chill.user_messages.dismissed.v1";
const AUTH_HANDOFF_ACTION_ORIGINS = new Set([
  publicLinks.binge,
  "https://staging.binge.institute",
  "http://localhost:58400",
  "http://localhost:58401",
]);
const storageCache = new WeakMap<Storage, Map<string, string | null>>();

const USER_MESSAGES: UserMessage[] = [
  {
    id: "binge-online-alberto-2026-05",
    surface: "modal",
    priority: 100,
    badge: "binge.institute",
    sender: {
      name: "Alberto",
      avatarSrc: "/alberto.jpg",
      avatarAlt: "Alberto",
    },
    title: "binge.institute is online",
    description: "Movies and TV shows moved into a new house.",
    body: [
      "Catalog browsing now lives at binge.institute, which means chill.institute can stay lean, direct, and extremely focused on searches.",
      "Your put.io sign-in comes with you. Hit the button and Alberto will hold the door.",
    ],
    primaryAction: {
      label: "Open binge.institute",
      href: publicLinks.binge,
      handoffAuthToken: true,
    },
    dismissLabel: "Thanks Alberto",
  },
];

export const localUserMessageSource: UserMessageSource = () => USER_MESSAGES;

export function getNextUserMessage({
  dismissed,
  messages = USER_MESSAGES,
  now = new Date(),
}: {
  dismissed: StoredUserMessageState;
  messages?: readonly UserMessage[];
  now?: Date;
}) {
  return getVisibleUserMessages({ dismissed, messages, now, surface: "modal" })[0] ?? null;
}

export function getVisibleUserMessages({
  dismissed,
  messages = USER_MESSAGES,
  now = new Date(),
  surface,
}: {
  dismissed: StoredUserMessageState;
  messages?: readonly UserMessage[];
  now?: Date;
  surface?: UserMessageSurface;
}) {
  return messages
    .filter(
      (message) =>
        (!surface || message.surface === surface) && shouldShowUserMessage(message, dismissed, now),
    )
    .toSorted((left, right) => right.priority - left.priority);
}

export function readDismissedUserMessages(storage = getUserMessageStorage()) {
  if (!storage) {
    return {};
  }

  let raw: string | null;
  raw = readCachedStorageItem(storage, DISMISSED_MESSAGES_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => {
        const [id, dismissedAt] = entry;
        return id.trim().length > 0 && typeof dismissedAt === "string";
      }),
    );
  } catch {
    return {};
  }
}

export function markUserMessageDismissed(
  dismissed: StoredUserMessageState,
  messageId: string,
  now = new Date(),
) {
  return {
    ...dismissed,
    [messageId]: now.toISOString(),
  };
}

export function writeDismissedUserMessages(
  dismissed: StoredUserMessageState,
  storage = getUserMessageStorage(),
) {
  if (!storage) {
    return dismissed;
  }

  writeCachedStorageItem(storage, DISMISSED_MESSAGES_STORAGE_KEY, JSON.stringify(dismissed));
  return dismissed;
}

export function dismissUserMessage(
  messageId: string,
  storage = getUserMessageStorage(),
  now = new Date(),
) {
  const dismissed = storage ? readDismissedUserMessages(storage) : {};
  return writeDismissedUserMessages(markUserMessageDismissed(dismissed, messageId, now), storage);
}

export function getUserMessageActionHref(message: UserMessage, authToken: string | null) {
  if (
    !message.primaryAction.handoffAuthToken ||
    !authToken ||
    !canHandoffAuthTokenToAction(message.primaryAction.href)
  ) {
    return message.primaryAction.href;
  }

  return buildAuthHandoffURL({
    targetOrigin: message.primaryAction.href,
    token: authToken,
  });
}

function canHandoffAuthTokenToAction(href: string) {
  try {
    return AUTH_HANDOFF_ACTION_ORIGINS.has(new URL(href).origin);
  } catch {
    return false;
  }
}

export function clearDismissedUserMessagesCache(storage = getUserMessageStorage()) {
  if (!storage) {
    return;
  }

  storageCache.get(storage)?.delete(DISMISSED_MESSAGES_STORAGE_KEY);
}

function shouldShowUserMessage(message: UserMessage, dismissed: StoredUserMessageState, now: Date) {
  if (dismissed[message.id]) {
    return false;
  }
  if (message.startsAt && now < new Date(message.startsAt)) {
    return false;
  }
  if (message.endsAt && now > new Date(message.endsAt)) {
    return false;
  }
  return true;
}

function readCachedStorageItem(storage: Storage, key: string) {
  const cache = getStorageCache(storage);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  try {
    const value = storage.getItem(key);
    cache.set(key, value);
    return value;
  } catch {
    return null;
  }
}

function writeCachedStorageItem(storage: Storage, key: string, value: string) {
  const cache = getStorageCache(storage);
  try {
    storage.setItem(key, value);
    cache.set(key, value);
  } catch {
    cache.delete(key);
  }
}

function getStorageCache(storage: Storage) {
  const existing = storageCache.get(storage);
  if (existing) {
    return existing;
  }

  const cache = new Map<string, string | null>();
  storageCache.set(storage, cache);
  return cache;
}

function getUserMessageStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
