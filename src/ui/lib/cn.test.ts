import { describe, expect, it } from "vite-plus/test";

import { cn } from "./cn";

describe("cn", () => {
  it("keeps custom font sizes beside text colours", () => {
    expect(cn("text-row text-fg-1")).toBe("text-row text-fg-1");
    expect(cn("break-words text-meta text-fg-3")).toBe("break-words text-meta text-fg-3");
    expect(cn("text-2xs text-fg-4")).toBe("text-2xs text-fg-4");
  });

  it("still lets the last font size win", () => {
    expect(cn("text-row text-meta")).toBe("text-meta");
    expect(cn("text-sm text-row")).toBe("text-row");
    expect(cn("text-2xs text-meta")).toBe("text-meta");
  });
});
