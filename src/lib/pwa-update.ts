// Browsers only check for a new service worker on navigation, so an app that
// stays open (home-screen PWA, pinned tab) never learns about a deploy. These
// helpers poll on foreground and on a timer, and apply a waiting update while
// the app is hidden so the reload never interrupts the user.

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

export { applyServiceWorkerUpdateWhenHidden, startServiceWorkerUpdateChecks };
