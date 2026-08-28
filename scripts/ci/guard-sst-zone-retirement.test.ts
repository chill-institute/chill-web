import { describe, expect, it } from "vite-plus/test";

import {
  expectedZoneSettingUrns,
  validateZoneRetirementDiff,
} from "./guard-sst-zone-retirement.ts";

const expectedDeletes = [...expectedZoneSettingUrns].map((urn) => ({
  op: "delete",
  type: "cloudflare:index/zoneSetting:ZoneSetting",
  urn,
}));

describe("SST zone retirement guard", () => {
  it("accepts exactly the four expected deletes", () => {
    expect(validateZoneRetirementDiff(expectedDeletes, "pre-deploy")).toBe(4);
  });

  it("rejects missing, extra, or non-delete changes", () => {
    expect(() => validateZoneRetirementDiff(expectedDeletes.slice(1), "pre-deploy")).toThrow(
      "expected=4 actual=3",
    );
    expect(() =>
      validateZoneRetirementDiff(
        [
          ...expectedDeletes,
          { op: "create", type: "cloudflare:index/zoneSetting:ZoneSetting", urn: "extra" },
        ],
        "pre-deploy",
      ),
    ).toThrow("expected=4 actual=5");
    expect(() =>
      validateZoneRetirementDiff(
        expectedDeletes.map((change, index) =>
          index === 0 ? { ...change, op: "update" } : change,
        ),
        "pre-deploy",
      ),
    ).toThrow("retirement contract failed");
  });

  it("requires an empty post-deploy diff", () => {
    expect(validateZoneRetirementDiff([], "post-deploy")).toBe(0);
    expect(() => validateZoneRetirementDiff(expectedDeletes, "post-deploy")).toThrow("changes=4");
  });
});
