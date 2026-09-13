import * as v from "valibot";
import { installationRequest } from "./api";

const operationSchema = v.object({
  id: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]{1,128}$/)),
  state: v.picklist(["unknown", "submitted"]),
  transferId: v.optional(v.string()),
});
const releaseSchema = v.object({
  id: v.string(),
  title: v.string(),
  indexer: v.string(),
  size: v.pipe(v.string(), v.regex(/^[0-9]+$/)),
  seeders: v.pipe(v.string(), v.regex(/^[0-9]+$/)),
});
const releasesSchema = v.object({
  releases: v.array(releaseSchema),
  operation: v.optional(operationSchema),
});
const statusSchema = v.object({
  ...operationSchema.entries,
  transfer: v.optional(
    v.object({
      status: v.string(),
      percentDone: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
      name: v.optional(v.string()),
    }),
  ),
  files: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      stremioId: v.pipe(v.string(), v.regex(/^chill:acquired:[a-zA-Z0-9_-]+:[0-9]+$/)),
    }),
  ),
});
export type AcquisitionTarget = { installation: string; type: "movie" | "series"; target: string };
export type AcquisitionOperation = v.InferOutput<typeof operationSchema>;

function validated<T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: T,
  value: unknown,
): v.InferOutput<T> {
  const parsed = v.safeParse(schema, value);
  if (!parsed.success) throw new Error("Invalid add-on response");
  return parsed.output;
}

export async function getReleases(token: string, target: AcquisitionTarget, signal?: AbortSignal) {
  const search = new URLSearchParams({ type: target.type, target: target.target });
  const response = await installationRequest(
    token,
    `/${encodeURIComponent(target.installation)}/releases?${search}`,
    "GET",
    signal,
  );
  return validated(releasesSchema, await response.json());
}

export async function acquireRelease(token: string, target: AcquisitionTarget, releaseId: string) {
  const response = await installationRequest(
    token,
    `/${encodeURIComponent(target.installation)}/acquisitions`,
    "POST",
    undefined,
    { type: target.type, target: target.target, releaseId },
  );
  return validated(operationSchema, await response.json());
}

export async function getAcquisition(
  token: string,
  installation: string,
  operation: string,
  signal?: AbortSignal,
) {
  const response = await installationRequest(
    token,
    `/${encodeURIComponent(installation)}/acquisitions/${encodeURIComponent(operation)}`,
    "GET",
    signal,
  );
  return validated(statusSchema, await response.json());
}
