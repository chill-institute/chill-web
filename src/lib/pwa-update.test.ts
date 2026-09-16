import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  applyServiceWorkerUpdateWhenHidden,
  createNavigationUpdateApplier,
  startServiceWorkerUpdateChecks,
} from "./pwa-update";

type Listener = () => void;

function createVisibilityTarget(initial: DocumentVisibilityState = "visible") {
  const listeners = new Set<Listener>();
  const target = {
    visibilityState: initial,
    addEventListener: (_type: string, listener: Listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: Listener) => {
      listeners.delete(listener);
    },
  };

  return {
    target,
    listenerCount: () => listeners.size,
    setVisibility(state: DocumentVisibilityState) {
      target.visibilityState = state;
      for (const listener of [...listeners]) listener();
    },
  };
}

describe("startServiceWorkerUpdateChecks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks when the app returns to the foreground after the minimum gap", () => {
    const update = vi.fn(() => Promise.resolve());
    const visibility = createVisibilityTarget("hidden");
    startServiceWorkerUpdateChecks(
      { update },
      { target: visibility.target, isOnline: () => true, minGapMs: 1000, intervalMs: 60_000 },
    );

    vi.advanceTimersByTime(500);
    visibility.setVisibility("visible");
    expect(update).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    visibility.setVisibility("hidden");
    visibility.setVisibility("visible");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("checks on a timer only while visible and online", () => {
    const update = vi.fn(() => Promise.resolve());
    let online = false;
    const visibility = createVisibilityTarget("visible");
    startServiceWorkerUpdateChecks(
      { update },
      { target: visibility.target, isOnline: () => online, minGapMs: 0, intervalMs: 1000 },
    );

    vi.advanceTimersByTime(1000);
    expect(update).not.toHaveBeenCalled();

    online = true;
    visibility.target.visibilityState = "hidden";
    vi.advanceTimersByTime(1000);
    expect(update).not.toHaveBeenCalled();

    visibility.target.visibilityState = "visible";
    vi.advanceTimersByTime(1000);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("swallows update failures and stops after cleanup", async () => {
    const update = vi.fn(() => Promise.reject(new Error("offline")));
    const visibility = createVisibilityTarget("visible");
    const stop = startServiceWorkerUpdateChecks(
      { update },
      { target: visibility.target, isOnline: () => true, minGapMs: 0, intervalMs: 1000 },
    );

    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);

    stop();
    vi.advanceTimersByTime(5000);
    visibility.setVisibility("visible");
    expect(update).toHaveBeenCalledTimes(1);
    expect(visibility.listenerCount()).toBe(0);
  });
});

describe("applyServiceWorkerUpdateWhenHidden", () => {
  it("applies once when the app is hidden and nothing is in flight", () => {
    const updateServiceWorker = vi.fn(() => Promise.resolve());
    const visibility = createVisibilityTarget("visible");
    let busy = true;
    applyServiceWorkerUpdateWhenHidden(updateServiceWorker, {
      target: visibility.target,
      canApply: () => !busy,
    });

    visibility.setVisibility("hidden");
    expect(updateServiceWorker).not.toHaveBeenCalled();

    busy = false;
    visibility.setVisibility("visible");
    expect(updateServiceWorker).not.toHaveBeenCalled();

    visibility.setVisibility("hidden");
    visibility.setVisibility("hidden");
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(visibility.listenerCount()).toBe(0);
  });

  it("does nothing after cancel", () => {
    const updateServiceWorker = vi.fn(() => Promise.resolve());
    const visibility = createVisibilityTarget("visible");
    const cancel = applyServiceWorkerUpdateWhenHidden(updateServiceWorker, {
      target: visibility.target,
    });

    cancel();
    visibility.setVisibility("hidden");
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});

describe("createNavigationUpdateApplier", () => {
  function createLocation(href: string) {
    return { href, assign: vi.fn(), reload: vi.fn() };
  }

  function nav(pathname: string, search = "") {
    return { preload: false, location: { pathname, href: `${pathname}${search}` } };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds the first path change after an update is waiting, once", () => {
    const updateServiceWorker = vi.fn(() => Promise.resolve());
    const applier = createNavigationUpdateApplier(updateServiceWorker, {
      location: () => createLocation("https://app.test/search?q=x"),
    });

    expect(applier.beforeLoad(nav("/search", "?q=x"))).toBeUndefined();
    expect(applier.beforeLoad(nav("/movies/1"))).toBeUndefined();
    expect(updateServiceWorker).not.toHaveBeenCalled();

    applier.markWaiting();
    expect(applier.beforeLoad(nav("/movies/1", "?source=a"))).toBeUndefined();
    expect(
      applier.beforeLoad({ preload: true, location: { pathname: "/", href: "/" } }),
    ).toBeUndefined();
    expect(updateServiceWorker).not.toHaveBeenCalled();

    expect(applier.beforeLoad(nav("/"))).toBeInstanceOf(Promise);
    expect(applier.beforeLoad(nav("/movies/2"))).toBeUndefined();
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("releases the hold after the ceiling", async () => {
    const applier = createNavigationUpdateApplier(() => Promise.resolve(), {
      location: () => createLocation("https://app.test/search"),
      holdMs: 1000,
    });
    applier.markWaiting();
    applier.beforeLoad(nav("/search"));
    let released = false;
    void applier.beforeLoad(nav("/movies/1"))?.then(() => {
      released = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(released).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(released).toBe(true);
  });

  it("skips navigation apply while a mutation is in flight", () => {
    const updateServiceWorker = vi.fn(() => Promise.resolve());
    const applier = createNavigationUpdateApplier(updateServiceWorker, {
      canApply: () => false,
      location: () => createLocation("https://app.test/"),
    });

    applier.markWaiting();
    applier.beforeLoad(nav("/"));
    expect(applier.beforeLoad(nav("/movies/1"))).toBeUndefined();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it("reloads onto the navigation target, or in place when already there", () => {
    const location = createLocation("https://app.test/search");
    const applier = createNavigationUpdateApplier(() => Promise.resolve(), {
      location: () => location,
    });

    applier.reload();
    expect(location.reload).toHaveBeenCalledTimes(1);
    expect(location.assign).not.toHaveBeenCalled();

    applier.markWaiting();
    applier.beforeLoad(nav("/search"));
    applier.beforeLoad(nav("/movies/1", "?source=a"));
    applier.reload();
    expect(location.assign).toHaveBeenCalledWith("https://app.test/movies/1?source=a");

    location.href = "https://app.test/movies/1?source=a";
    applier.reload();
    expect(location.reload).toHaveBeenCalledTimes(2);
  });
});
