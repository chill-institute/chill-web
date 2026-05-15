import { create } from "@bufbuild/protobuf";
import { ReleaseInfoSchema, type ReleaseInfo } from "@chill-institute/contracts/chill/v4/api_pb";

import type { SearchResult } from "./types";

export function deriveInfoFromRaw(raw: string): ReleaseInfo {
  const lower = raw.toLowerCase();
  const resolution =
    lower.match(/\b(2160p|1080p|720p|480p)\b/)?.[1] ?? (lower.includes("4k") ? "2160p" : "");
  const codec = /\b(x265|h\.?265|hevc)\b/.test(lower)
    ? "x265"
    : /\b(x264|h\.?264|avc)\b/.test(lower)
      ? "x264"
      : "";
  const hdr = lower.match(/\b(hdr10\+?|hdr|dv|dolby[\s.]?vision)\b/)?.[1] ?? "";
  const groupMatch = raw.replace(/\.(mkv|mp4|avi|mov|webm)$/i, "").match(/-(\w[\w.]{2,})$/);
  const group = groupMatch?.[1] ?? "";
  return create(ReleaseInfoSchema, { resolution, codec, hdr, group });
}

export function effectiveInfo(result: SearchResult): ReleaseInfo {
  const info = result.releaseInfo;
  if (info && (info.resolution || info.codec || info.hdr || info.audio || info.group)) {
    return info;
  }
  return deriveInfoFromRaw(result.title);
}
