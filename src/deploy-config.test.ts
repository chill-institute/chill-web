import { runInNewContext } from "node:vm";

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

type Config = { run(): Promise<Record<string, unknown>> };
type FetchListener = (event: { request: Request; respondWith(response: Response): void }) => void;

const sites: Array<{ domain: { name: string; aliases?: string[]; redirects?: string[] } }> = [];
const scripts: Array<{ content: string }> = [];
const routes: Array<{ pattern: string; zoneId: string }> = [];

async function loadConfig(target: "app" | "redirects", stage = "production") {
  vi.stubEnv("WEB_DEPLOY_TARGET", target);
  vi.stubEnv("CHILL_PRODUCTION_DOMAIN", "chill.institute");
  vi.stubEnv("BINGE_PRODUCTION_DOMAIN", "binge.institute");
  vi.stubEnv("CLOUDFLARE_DEFAULT_ACCOUNT_ID", "account");
  vi.stubGlobal("$app", { stage });
  vi.stubGlobal("$config", (config: Config) => config);
  vi.stubGlobal("sst", {
    cloudflare: {
      StaticSiteV2: class {
        url = "";
        constructor(_name: string, args: (typeof sites)[number]) {
          sites.push(args);
        }
      },
    },
  });
  vi.stubGlobal("cloudflare", {
    getZones: async ({ name }: { name: string }) => ({ results: [{ id: `zone:${name}`, name }] }),
    WorkersScript: class {
      constructor(_name: string, args: { content: string }) {
        scripts.push(args);
      }
    },
    WorkersRoute: class {
      constructor(_name: string, args: { pattern: string; zoneId: string }) {
        routes.push(args);
      }
    },
  });
  const module = (await import("../sst.config.ts")) as unknown as { default: Config };
  return module.default.run();
}

function redirectFrom(content: string, url: string) {
  let listener: FetchListener | undefined;
  runInNewContext(content, {
    URL,
    Response,
    addEventListener: (_type: string, handler: FetchListener) => {
      listener = handler;
    },
  });
  let response: Response | undefined;
  listener?.({ request: new Request(url), respondWith: (value) => (response = value) });
  return response;
}

describe("deploy config", () => {
  beforeEach(() => {
    vi.resetModules();
    sites.length = 0;
    scripts.length = 0;
    routes.length = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("serves the production app on chill.institute and binge.institute", async () => {
    await loadConfig("app", "production");

    expect(sites).toHaveLength(1);
    expect(sites[0].domain.name).toBe("chill.institute");
    expect(sites[0].domain.aliases).toEqual(["binge.institute"]);
  });

  it.each(["app", "redirects"] as const)(
    "refuses to deploy %s outside production",
    async (target) => {
      await expect(loadConfig(target, "staging")).rejects.toThrow("SST stage must be production");
      expect(sites).toEqual([]);
      expect(routes).toEqual([]);
    },
  );

  it("routes only the www hosts to the redirect worker, each in its own zone", async () => {
    const output = await loadConfig("redirects", "production");

    expect(routes).toEqual([
      expect.objectContaining({ pattern: "www.chill.institute/*", zoneId: "zone:chill.institute" }),
      expect.objectContaining({ pattern: "www.binge.institute/*", zoneId: "zone:binge.institute" }),
    ]);
    expect(output.redirects).toEqual({
      "www.chill.institute": "https://chill.institute",
      "www.binge.institute": "https://binge.institute",
    });
  });

  it.each([
    ["http://www.chill.institute/movies?q=1", "https://chill.institute/movies?q=1"],
    [
      "https://www.binge.institute/auth/success?nonce=n",
      "https://binge.institute/auth/success?nonce=n",
    ],
  ])("redirects %s to %s", async (from, to) => {
    await loadConfig("redirects", "production");

    const response = redirectFrom(scripts[0].content, from);

    expect(response?.status).toBe(301);
    expect(response?.headers.get("location")).toBe(to);
  });
});
