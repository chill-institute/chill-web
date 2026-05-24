import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as v from "valibot";

import { readStorageValue, writeStorageValue } from "./storage-codec";

function createMapStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage codec", () => {
  it("round-trips negative bigint values", () => {
    const localStorage = createMapStorage();
    vi.stubGlobal("localStorage", localStorage);
    const schema = v.object({ value: v.bigint() });

    writeStorageValue({
      key: "test-key",
      value: { value: -42n },
      failureMessage: "Failed to write test value",
      createStoredValue: (value) => value,
    });

    expect(localStorage.getItem("test-key")).toBe('{"value":"-42n"}');
    expect(
      readStorageValue({
        key: "test-key",
        schema,
        failureMessage: "Failed to read test value",
        invalidMessage: "Invalid test value",
        createValue: (parsed) => parsed.value,
      }),
    ).toBe(-42n);
  });
});
