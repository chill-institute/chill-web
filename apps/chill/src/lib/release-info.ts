import { create } from "@bufbuild/protobuf";
import { normalizeCodecFilterValue } from "@chill-institute/api/release-info";
import { ReleaseInfoSchema, type ReleaseInfo } from "@chill-institute/contracts/chill/v4/api_pb";

import type { SearchResult } from "./types";

function deriveInfoFromRaw(raw: string): ReleaseInfo {
  const lower = raw.toLowerCase();
  const resolution =
    lower.match(/\b(2160p|1080p|720p|480p)\b/)?.[1] ?? (lower.includes("4k") ? "2160p" : "");
  const codec = normalizeCodecFilterValue(
    lower.match(/\b(?:x[ ._-]?26[45]|h[ ._-]?26[45]|hevc|avc)\b/)?.[0],
  );
  const hdr = lower.match(/\b(hdr10\+?|hdr|dv|dolby[\s.]?vision)\b/)?.[1] ?? "";
  const groupMatch = raw.replace(/\.(mkv|mp4|avi|mov|webm)$/i, "").match(/-(\w[\w.]{2,})$/);
  const group = groupMatch?.[1] ?? "";
  return create(ReleaseInfoSchema, { resolution, codec: codec ?? "", hdr, group });
}

export function effectiveInfo(result: SearchResult): ReleaseInfo {
  const info = result.releaseInfo;
  if (info && (info.resolution || info.codec || info.hdr || info.audio || info.group)) {
    return info;
  }
  return deriveInfoFromRaw(result.title);
}
