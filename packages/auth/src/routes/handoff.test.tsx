import { describe, expect, it } from "vite-plus/test";

import { getTrustedHandoffReferrerOrigins } from "./handoff";

describe("getTrustedHandoffReferrerOrigins", () => {
  it("keeps production handoffs on production origins", () => {
    expect(getTrustedHandoffReferrerOrigins("https://binge.institute")).toEqual([
      "https://chill.institute",
      "https://binge.institute",
    ]);
  });

  it("keeps staging handoffs on staging origins", () => {
    expect(getTrustedHandoffReferrerOrigins("https://staging.binge.institute")).toEqual([
      "https://staging.chill.institute",
      "https://staging.binge.institute",
    ]);
  });

  it("allows local handoffs only on local app origins", () => {
    expect(getTrustedHandoffReferrerOrigins("http://localhost:58401")).toEqual([
      "https://chill.institute",
      "https://binge.institute",
      "https://staging.chill.institute",
      "https://staging.binge.institute",
      "http://localhost:58300",
      "http://localhost:58301",
      "http://localhost:58400",
      "http://localhost:58401",
    ]);
  });
});
