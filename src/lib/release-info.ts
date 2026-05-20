import { create } from "@bufbuild/protobuf";
import { ReleaseInfoSchema, type ReleaseInfo } from "@chill-institute/contracts/chill/v4/api_pb";

import type { SearchResult } from "./types";

export function effectiveInfo(result: SearchResult): ReleaseInfo {
  const info = result.releaseInfo;
  if (info && (info.resolution || info.codec || info.hdr || info.audio || info.group)) {
    return info;
  }
  return create(ReleaseInfoSchema, {});
}
