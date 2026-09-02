import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";

const workflowsDir = join(__dirname, "../../.github/workflows");

const shaPinned = /uses: [^./][^\s@]+@[0-9a-f]{40}( #.*)?$/;

function workflows(): Map<string, string> {
  const out = new Map<string, string>();
  for (const entry of readdirSync(workflowsDir, { withFileTypes: true })) {
    if (entry.isDirectory() || !entry.name.endsWith(".yml")) {
      continue;
    }
    out.set(entry.name, readFileSync(join(workflowsDir, entry.name), "utf8"));
  }
  if (out.size === 0) {
    throw new Error("no workflows found");
  }
  return out;
}

describe("org workflow invariants", () => {
  const ws = workflows();
  for (const [name, w] of ws) {
    test(name, () => {
      expect(w.includes("\n  schedule:\n")).toBe(false);
      expect(w.includes("pull_request_target")).toBe(false);
      expect(w.includes("\npermissions:")).toBe(true);

      for (const line of w.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("uses: ") && !trimmed.startsWith("uses: ./")) {
          expect(shaPinned.test(trimmed), `action is not SHA-pinned: ${trimmed}`).toBe(true);
        }
      }

      const checkoutCount = (w.match(/actions\/checkout@/g) ?? []).length;
      const persistFalseCount = (w.match(/persist-credentials: false/g) ?? []).length;
      expect(checkoutCount).toBe(persistFalseCount);
    });
  }
});

describe("Cloudflare receiver contract", () => {
  const ws = workflows();
  const file = "cloudflare-pwa-schedule.yml";
  const target = "pwa-installability";
  const cron = "0 9 * * MON";
  const hour = "09";
  const downstream = "pwa-installability.yml";

  test(file, () => {
    const w = ws.get(file);
    expect(w, "receiver missing").toBeDefined();
    if (!w) return;

    const required = [
      "permissions: {}",
      `group: ${file.replace(/\.yml$/, "")}-receiver`,
      "queue: max",
      "cancel-in-progress: false",
      "  validate-cloudflare-dispatch:",
      "EXPECTED_ACTOR_ID: ${{ vars.CLOUDFLARE_SCHEDULER_ACTOR_ID }}",
      `[ "\${ACTOR_ID}" = "\${EXPECTED_ACTOR_ID}" ]`,
      `[ "\${ACTOR_LOGIN}" = 'chill-scheduler[bot]' ]`,
      `[ "\${TRIGGERING_ACTOR}" = "\${ACTOR_LOGIN}" ]`,
      `[ "\${RUN_ATTEMPT}" = 1 ]`,
      `[ "\${EVENT_NAME}" = workflow_dispatch ]`,
      `[ "\${REF_NAME}" = refs/heads/main ]`,
      `[ "\${SCHEDULE_ORIGIN}" = cloudflare ]`,
      `[ "\${TARGET}" = ${target} ]`,
      `[ "\${WORKFLOW_FILE}" = ${file} ]`,
      `[ "\${DISPATCH_REF}" = main ]`,
      `[ "\${SCHEDULE_CRON}" = "${cron}" ]`,
      `[ "\${SCHEDULED_AT:11:2}" = ${hour} ]`,
      `[ "\${SCHEDULED_AT:14:2}" = 00 ]`,
      `[ "\${SCHEDULED_AT:17:2}" = 00 ]`,
      `[ "\${SCHEDULE_ID}" = "${target}:\${SCHEDULED_AT}" ]`,
      "needs: validate-cloudflare-dispatch",
      "if: ${{ github.run_attempt == 1 }}",
      `uses: ./.github/workflows/${downstream}`,
      `[ "$(date -u --date="\${SCHEDULED_AT}" '+%u')" = 1 ]`,
      "run_android_emulator: true",
      "chill_url: http://127.0.0.1:58321/",
    ];

    for (const s of required) {
      expect(w.includes(s), `missing ${JSON.stringify(s)}`).toBe(true);
    }

    for (const s of ["environment:", "actions/checkout", "curl ", "gh ", "ssh "]) {
      expect(w.includes(s), `forbidden ${JSON.stringify(s)}`).toBe(false);
    }

    expect(
      (w.match(/\n {8}run: \|/g) ?? []).length,
      "receiver must have exactly one shell step",
    ).toBe(1);

    const validate = w.indexOf("  validate-cloudflare-dispatch:");
    const run = w.indexOf(`uses: ./.github/workflows/${downstream}`);
    expect(validate).toBeGreaterThanOrEqual(0);
    expect(run).toBeGreaterThan(validate);
  });
});

describe("plan 002/003 expression pins", () => {
  test("deploy.yml gates deploy-redirects on the validate job", () => {
    const w = readFileSync(join(workflowsDir, "deploy.yml"), "utf8");
    expect(w.includes("needs.validate.result == 'success'")).toBe(true);
  });

  test("verify.yml scopes concurrency by merge_group head sha", () => {
    const w = readFileSync(join(workflowsDir, "verify.yml"), "utf8");
    expect(w.includes("github.event.merge_group.head_sha")).toBe(true);
  });

  test.each(["_deploy-app.yml", "_deploy-sst-target.yml"])(
    "%s gates on restore-sst-state outcome",
    (file: string) => {
      const w = readFileSync(join(workflowsDir, file), "utf8");
      expect(w.includes("steps.restore-sst-state.outcome == 'success'")).toBe(true);
    },
  );
});
