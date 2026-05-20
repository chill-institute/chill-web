function readEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

const app = {
  domain: {
    staging: {
      name: readEnvironment("CHILL_STAGING_DOMAIN"),
    },
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
    resourcePrefix: "ChillRedirect",
  },
  {
    zoneName: bingeProductionDomain,
    domains: [bingeProductionDomain, bingeProductionRedirectDomain],
    resourcePrefix: "BingeRedirect",
  },
] as const;

const zoneHardening = [
  {
    name: app.domain.production.name,
    prefix: "Chill",
  },
  {
    name: bingeProductionDomain,
    prefix: "Binge",
  },
] as const;

const zoneSettings = [
  {
    name: "AlwaysUseHttps",
    settingId: "always_use_https",
    value: "on",
  },
  {
    name: "AutomaticHttpsRewrites",
    settingId: "automatic_https_rewrites",
    value: "on",
  },
] as const;

type DeployTarget = "app" | "redirects" | "zones";
type Stage = "staging" | "production";
type StaticSiteV2Args = {
  domain: {
    name: string;
    redirects?: readonly string[];
  };
  notFound: "single-page-application";
  path: string;
};
type ZoneSettingArgs = {
  settingId: string;
  value: string;
  zoneId: string;
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
    removal: "retain" | "retain-all";
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
  ZoneSetting: new (name: string, args: ZoneSettingArgs) => unknown;
  WorkersScript: new (name: string, args: WorkersScriptArgs) => unknown;
  WorkersRoute: new (name: string, args: WorkersRouteArgs, opts?: ResourceOptions) => unknown;
};

function resolveDeployTarget(): DeployTarget {
  const target = process.env.WEB_DEPLOY_TARGET;
  if (target === "app" || target === "redirects" || target === "zones") {
    return target;
  }

  throw new Error("WEB_DEPLOY_TARGET must be set to app, redirects, or zones");
}

function resolveStage(stage: string): Stage {
  if (stage === "staging" || stage === "production") {
    return stage;
  }

  throw new Error("SST stage must be staging or production");
}

function resolveAccountId() {
  const accountId = process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID?.trim();
  if (!accountId) {
    throw new Error("CLOUDFLARE_DEFAULT_ACCOUNT_ID is required for zone hardening");
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

function resolveStaticSiteDomain(stage: Stage): StaticSiteV2Args["domain"] {
  if (stage === "staging") {
    return app.domain.staging;
  }

  return app.domain.production;
}

async function configureZoneHardening() {
  const accountId = resolveAccountId();
  const outputs: Record<string, string> = {};

  const resolvedZones = await Promise.all(
    zoneHardening.map(async (zoneConfig) => ({
      prefix: zoneConfig.prefix,
      zoneId: await resolveZoneId(accountId, zoneConfig.name),
    })),
  );

  for (const zoneConfig of resolvedZones) {
    outputs[`${zoneConfig.prefix}ZoneId`] = zoneConfig.zoneId;

    for (const setting of zoneSettings) {
      new cloudflare.ZoneSetting(`${zoneConfig.prefix}${setting.name}`, {
        zoneId: zoneConfig.zoneId,
        settingId: setting.settingId,
        value: setting.value,
      });
    }
  }

  return outputs;
}

async function configureRedirects(stage: Stage) {
  if (stage !== "production") {
    return {};
  }

  const accountId = resolveAccountId();
  const scriptName = "chill-web-binge-redirect";

  const redirectWorker = new cloudflare.WorkersScript("BingeRedirectWorker", {
    accountId,
    compatibilityDate: "2026-05-19",
    scriptName,
    content: `
addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  url.protocol = "https:";
  url.hostname = "${app.domain.production.name}";
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
      routes[domain] = `https://${app.domain.production.name}`;
    }
  }

  return routes;
}

export default $config({
  app(input) {
    const target = resolveDeployTarget();
    const stage = resolveStage(input.stage);
    if (target === "zones" && stage !== "staging") {
      throw new Error("WEB_DEPLOY_TARGET=zones must use SST stage staging");
    }
    if (target === "redirects" && stage !== "production") {
      throw new Error("WEB_DEPLOY_TARGET=redirects must use SST stage production");
    }

    return {
      name: `chill-web-${target}`,
      home: "local",
      providers: {
        cloudflare: "6.15.0",
      },
      protect: stage === "production",
      removal: stage === "production" ? "retain" : "retain-all",
    };
  },
  async run() {
    const target = resolveDeployTarget();
    const stage = resolveStage($app.stage);

    if (target === "zones") {
      const zones = await configureZoneHardening();

      return {
        target,
        stage,
        zones,
      };
    }
    if (target === "redirects") {
      const redirects = await configureRedirects(stage);

      return {
        target,
        stage,
        redirects,
      };
    }

    const site = new sst.cloudflare.StaticSiteV2("Web", {
      path: app.path,
      domain: resolveStaticSiteDomain(stage),
      notFound: "single-page-application",
    });

    return {
      target,
      stage,
      url: site.url,
    };
  },
});
