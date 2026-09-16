// Browsers only check for a new service worker on navigation, so an app that
// stays open (home-screen PWA, pinned tab) never learns about a deploy. These
// helpers poll on foreground and on a timer, and apply a waiting update while
// the app is hidden or on the next route change, moments where a reload does
// not interrupt the user.

import { queryClient } from "@/query-client";

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

type VisibilityTarget = {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

type UpdateCheckOptions = {
  target?: VisibilityTarget;
  isOnline?: () => boolean;
  now?: () => number;
  intervalMs?: number;
  minGapMs?: number;
};

type BackgroundApplyOptions = {
  target?: VisibilityTarget;
  canApply?: () => boolean;
};

const defaultCheckIntervalMs = 60 * 60 * 1000;
const defaultCheckMinGapMs = 5 * 60 * 1000;

function startServiceWorkerUpdateChecks(
  registration: { update(): Promise<unknown> },
  {
    target = document,
    isOnline = () => navigator.onLine,
    now = () => Date.now(),
    intervalMs = defaultCheckIntervalMs,
    minGapMs = defaultCheckMinGapMs,
  }: UpdateCheckOptions = {},
) {
  let lastCheckedAt = now();

  const check = () => {
    if (target.visibilityState !== "visible" || !isOnline()) return;
    if (now() - lastCheckedAt < minGapMs) return;
    lastCheckedAt = now();
    registration.update().catch(() => undefined);
  };

  const timer = setInterval(check, intervalMs);
  target.addEventListener("visibilitychange", check);

  return () => {
    clearInterval(timer);
    target.removeEventListener("visibilitychange", check);
  };
}

function applyServiceWorkerUpdateWhenHidden(
  updateServiceWorker: UpdateServiceWorker,
  { target = document, canApply = () => true }: BackgroundApplyOptions = {},
) {
  const onVisibilityChange = () => {
    if (target.visibilityState !== "hidden" || !canApply()) return;
    target.removeEventListener("visibilitychange", onVisibilityChange);
    void updateServiceWorker(true);
  };

  target.addEventListener("visibilitychange", onVisibilityChange);

  return () => target.removeEventListener("visibilitychange", onVisibilityChange);
}

type BeforeLoadEvent = {
  preload: boolean;
  location: { pathname: string; href: string };
};

type NavigationLocation = Pick<Location, "href" | "assign" | "reload">;

type NavigationApplyOptions = {
  canApply?: () => boolean;
  location?: () => NavigationLocation;
  holdMs?: number;
};

const defaultNavigationHoldMs = 5000;

// Runs from the root route's beforeLoad, which precedes any route chunk
// request. Holding the transition there keeps the old page from asking the
// newly activated worker for chunks it no longer has; `reload` then replaces
// the document with the navigation target. The hold has a ceiling so a worker
// that never takes control does not leave the app pending.
function createNavigationUpdateApplier(
  updateServiceWorker: UpdateServiceWorker,
  {
    canApply = () => true,
    location = () => window.location,
    holdMs = defaultNavigationHoldMs,
  }: NavigationApplyOptions = {},
) {
  let waiting = false;
  let lastPathname: string | undefined;
  let targetHref: string | undefined;

  return {
    markWaiting() {
      waiting = true;
    },
    beforeLoad(event: BeforeLoadEvent): Promise<void> | undefined {
      if (event.preload) return;
      const pathChanged = lastPathname !== undefined && lastPathname !== event.location.pathname;
      lastPathname = event.location.pathname;
      if (!waiting || targetHref !== undefined || !pathChanged || !canApply()) return;
      targetHref = new URL(event.location.href, location().href).href;
      void updateServiceWorker(true);
      return new Promise((resolve) => {
        setTimeout(resolve, holdMs);
      });
    },
    reload() {
      const current = location();
      if (targetHref !== undefined && targetHref !== current.href) {
        current.assign(targetHref);
        return;
      }
      current.reload();
    },
  };
}

let boundUpdateServiceWorker: UpdateServiceWorker | undefined;

const navigationUpdate = createNavigationUpdateApplier(
  (reload) => boundUpdateServiceWorker?.(reload) ?? Promise.resolve(),
  { canApply: () => queryClient.isMutating() === 0 },
);

function bindNavigationUpdate(updateServiceWorker: UpdateServiceWorker) {
  boundUpdateServiceWorker = updateServiceWorker;
}

export {
  applyServiceWorkerUpdateWhenHidden,
  bindNavigationUpdate,
  createNavigationUpdateApplier,
  navigationUpdate,
  startServiceWorkerUpdateChecks,
};
