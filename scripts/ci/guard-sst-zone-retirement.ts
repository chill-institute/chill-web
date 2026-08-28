import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import * as v from "valibot";

const pulumiChangeSchema = v.object({
  op: v.string(),
  type: v.string(),
  urn: v.string(),
});

const pulumiDiffSchema = v.array(pulumiChangeSchema);

export const expectedZoneSettingUrns = new Set([
  "urn:pulumi:staging::chill-web-zones::cloudflare:index/zoneSetting:ZoneSetting::BingeAlwaysUseHttps",
  "urn:pulumi:staging::chill-web-zones::cloudflare:index/zoneSetting:ZoneSetting::BingeAutomaticHttpsRewrites",
  "urn:pulumi:staging::chill-web-zones::cloudflare:index/zoneSetting:ZoneSetting::ChillAlwaysUseHttps",
  "urn:pulumi:staging::chill-web-zones::cloudflare:index/zoneSetting:ZoneSetting::ChillAutomaticHttpsRewrites",
]);

export type RetirementPhase = "pre-deploy" | "post-deploy";

export function validateZoneRetirementDiff(input: unknown, phase: RetirementPhase): number {
  const changes = v.parse(pulumiDiffSchema, input);
  if (phase === "post-deploy") {
    if (changes.length !== 0) {
      throw new Error(`post-deploy diff is not empty: changes=${changes.length}`);
    }
    return 0;
  }

  const urns = new Set(changes.map((change) => change.urn));
  const exactUrns =
    urns.size === expectedZoneSettingUrns.size &&
    [...urns].every((urn) => expectedZoneSettingUrns.has(urn));
  const exactDeletes = changes.every(
    (change) =>
      change.op === "delete" && change.type === "cloudflare:index/zoneSetting:ZoneSetting",
  );
  if (!exactUrns || !exactDeletes || changes.length !== expectedZoneSettingUrns.size) {
    const summary = changes
      .map((change) => `${change.op}:${change.type}:${change.urn.split("::").at(-1) ?? "unknown"}`)
      .sort()
      .join(",");
    throw new Error(
      `pre-deploy retirement contract failed: expected=${expectedZoneSettingUrns.size} actual=${changes.length} changes=${summary}`,
    );
  }
  return changes.length;
}

async function main() {
  const [phase, diffPath] = process.argv.slice(2);
  if ((phase !== "pre-deploy" && phase !== "post-deploy") || !diffPath) {
    throw new Error(
      "usage: node scripts/ci/guard-sst-zone-retirement.ts <pre-deploy|post-deploy> <diff.json>",
    );
  }
  const input: unknown = JSON.parse(await readFile(diffPath, "utf8"));
  const count = validateZoneRetirementDiff(input, phase);
  console.log(`${phase} SST zone-retirement boundary verified: changes=${count}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
