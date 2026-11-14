function readEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

const app = {
  domain: {
    production: {
      name: readEnvironment("CHILL_PRODUCTION_DOMAIN"),
    },
  },
  path: "dist",
} as const;

const bingeProductionDomain = readEnvironment("BINGE_PRODUCTION_DOMAIN");
const bingeProductionRedirectDomain = readEnvironment("BINGE_PRODUCTION_REDIRECT_DOMAIN");
const appProductionRedirectDomain = `www.${app.domain.production.name}`;

const redirectRouteGroups = [
  {
    zoneName: app.domain.production.name,
    domains: [appProductionRedirectDomain],
    target: app.domain.production.name,
    resourcePrefix: "ChillRedirect",
  },
  {
    zoneName: bingeProductionDomain,
    domains: [bingeProductionRedirectDomain],
    target: bingeProductionDomain,
    resourcePrefix: "BingeRedirect",
  },
] as const;

const redirectTargets = Object.fromEntries(
  redirectRouteGroups.flatMap((group) => group.domains.map((domain) => [domain, group.target])),
);

type DeployTarget = "app" | "redirects";
type StaticSiteV2Args = {
  domain: {
    name: string;
    aliases?: readonly string[];
    redirects?: readonly string[];
  };
  notFound: "single-page-application";
  path: string;
  transform?: {
    server?: (args: StaticSiteWorkerArgs) => void;
  };
};
type StaticSiteWorkerArgs = {
  handler?: string;
};
type ZoneLookupResult = {
  results: Array<{
    id: string;
    name: string;
  }>;
};
type WorkersScriptArgs = {
  accountId: string;
  compatibilityDate: string;
  content: string;
  scriptName: string;
};
type WorkersRouteArgs = {
  pattern: string;
  script: string;
  zoneId: string;
};
type ResourceOptions = {
  dependsOn?: readonly unknown[];
};

declare const $app: { stage: string };
declare const $config: (config: {
  app(input: { stage: string }): {
    home: "local";
    name: string;
    protect: boolean;
    providers: { cloudflare: string };
    removal: "retain";
  };
  run(): Promise<Record<string, unknown>>;
}) => unknown;
declare const sst: {
  cloudflare: {
    StaticSiteV2: new (name: string, args: StaticSiteV2Args) => { url: unknown };
  };
};
declare const cloudflare: {
  getZones(args: {
    account: {
      id: string;
    };
    maxItems: number;
    name: string;
  }): Promise<ZoneLookupResult>;
  WorkersScript: new (name: string, args: WorkersScriptArgs) => unknown;
  WorkersRoute: new (name: string, args: WorkersRouteArgs, opts?: ResourceOptions) => unknown;
};

function resolveDeployTarget(): DeployTarget {
  const target = process.env.WEB_DEPLOY_TARGET;
  if (target === "app" || target === "redirects") {
    return target;
  }

  throw new Error("WEB_DEPLOY_TARGET must be set to app or redirects");
}

function requireProductionStage(stage: string) {
  if (stage === "production") {
    return stage;
  }

  throw new Error("SST stage must be production");
}

function resolveAccountId() {
  const accountId = process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID?.trim();
  if (!accountId) {
    throw new Error("CLOUDFLARE_DEFAULT_ACCOUNT_ID is required for Cloudflare redirects");
  }

  return accountId;
}

async function resolveZoneId(accountId: string, name: string) {
  const zones = await cloudflare.getZones({
    account: {
      id: accountId,
    },
    maxItems: 1,
    name,
  });
  const zone = zones.results.find((result) => result.name === name);
  if (!zone) {
    throw new Error(`Cloudflare zone not found: ${name}`);
  }

  return zone.id;
}

async function configureRedirects() {
  const accountId = resolveAccountId();
  const scriptName = "chill-web-binge-redirect";

  const redirectWorker = new cloudflare.WorkersScript("BingeRedirectWorker", {
    accountId,
    compatibilityDate: "2026-05-19",
    scriptName,
    content: `
const targets = ${JSON.stringify(redirectTargets)};
addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  url.protocol = "https:";
  url.hostname = targets[url.hostname] ?? "${app.domain.production.name}";
  event.respondWith(Response.redirect(url.toString(), 301));
});
`.trim(),
  });

  const routeGroups = await Promise.all(
    redirectRouteGroups.map(async (group) => ({
      group,
      zoneId: await resolveZoneId(accountId, group.zoneName),
    })),
  );

  const routes: Record<string, string> = {};
  for (const { group, zoneId } of routeGroups) {
    for (const domain of group.domains) {
      const name = domain.replace(/[^a-zA-Z0-9]/g, "");
      new cloudflare.WorkersRoute(
        `${group.resourcePrefix}${name}`,
        {
          zoneId,
          pattern: `${domain}/*`,
          script: scriptName,
        },
        {
          dependsOn: [redirectWorker],
        },
      );
      routes[domain] = `https://${group.target}`;
    }
  }

  return routes;
}

export default $config({
  app(input) {
    const target = resolveDeployTarget();
    requireProductionStage(input.stage);

    return {
      name: `chill-web-${target}`,
      home: "local",
      providers: {
        cloudflare: "6.15.0",
      },
      protect: true,
      removal: "retain",
    };
  },
  async run() {
    const target = resolveDeployTarget();
    const stage = requireProductionStage($app.stage);

    if (target === "redirects") {
      const redirects = await configureRedirects();

      return {
        target,
        stage,
        redirects,
      };
    }

    const site = new sst.cloudflare.StaticSiteV2("Web", {
      path: app.path,
      domain: {
        ...app.domain.production,
        aliases: [bingeProductionDomain],
      },
      notFound: "single-page-application",
      transform: {
        server(args) {
          args.handler = "src/workers/static-assets.ts";
        },
      },
    });

    return {
      target,
      stage,
      url: site.url,
    };
  },
});
