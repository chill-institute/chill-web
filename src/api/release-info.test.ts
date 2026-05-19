import { describe, expect, it } from "vite-plus/test";

import { normalizeCodecFilterValue } from "./release-info";

describe("normalizeCodecFilterValue", () => {
  it("normalizes H.264-family codec labels to the x264 filter value", () => {
    expect(normalizeCodecFilterValue("x264")).toBe("x264");
    expect(normalizeCodecFilterValue("x-264")).toBe("x264");
    expect(normalizeCodecFilterValue("H264")).toBe("x264");
    expect(normalizeCodecFilterValue("H-264")).toBe("x264");
    expect(normalizeCodecFilterValue("H_264")).toBe("x264");
    expect(normalizeCodecFilterValue("AVC")).toBe("x264");
  });

  it("normalizes H.265-family codec labels to the x265 filter value", () => {
    expect(normalizeCodecFilterValue("x265")).toBe("x265");
    expect(normalizeCodecFilterValue("x_265")).toBe("x265");
    expect(normalizeCodecFilterValue("H265")).toBe("x265");
    expect(normalizeCodecFilterValue("H-265")).toBe("x265");
    expect(normalizeCodecFilterValue("HEVC")).toBe("x265");
  });

  it("ignores codecs without a matching quick filter", () => {
    expect(normalizeCodecFilterValue("AV1")).toBeUndefined();
    expect(normalizeCodecFilterValue("")).toBeUndefined();
    expect(normalizeCodecFilterValue(undefined)).toBeUndefined();
  });
});
