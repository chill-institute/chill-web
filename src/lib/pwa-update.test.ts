import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { applyServiceWorkerUpdateWhenHidden, startServiceWorkerUpdateChecks } from "./pwa-update";

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
