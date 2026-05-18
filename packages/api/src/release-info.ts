export type CodecFilterValue = "x264" | "x265";

export function normalizeCodecFilterValue(codec: string | undefined): CodecFilterValue | undefined {
  const collapsed = codec?.toLowerCase().replace(/[ ._-]/g, "");
  switch (collapsed) {
    case "x264":
    case "h264":
    case "avc":
      return "x264";
    case "x265":
    case "h265":
    case "hevc":
      return "x265";
    default:
      return undefined;
  }
}
