function readEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

const surfaces = {
  app: {
    domain: {
      staging: {
        name: readEnvironment("CHILL_STAGING_DOMAIN"),
      },
      production: {
        name: readEnvironment("CHILL_PRODUCTION_DOMAIN"),
      },
    },
    path: "dist",
  },
} as const;

const bingeRedirectDomains = [
  readEnvironment("BINGE_PRODUCTION_DOMAIN"),
  readEnvironment("BINGE_PRODUCTION_REDIRECT_DOMAIN"),
] as const;

const zoneHardening = [
  {
    name: surfaces.app.domain.production.name,
    prefix: "Chill",
  },
  {
    name: readEnvironment("BINGE_PRODUCTION_DOMAIN"),
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

type AppSurface = keyof typeof surfaces;
type Surface = AppSurface | "redirects" | "zones";
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

function resolveSurface(): Surface {
  const surface = process.env.WEB_DEPLOY_TARGET;
  if (surface === "app" || surface === "redirects" || surface === "zones") {
    return surface;
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

function resolveStaticSiteDomain(surface: AppSurface, stage: Stage): StaticSiteV2Args["domain"] {
  if (stage === "staging") {
    return surfaces[surface].domain.staging;
  }

  return surfaces[surface].domain.production;
}

async function configureZoneHardening() {
  const accountId = resolveAccountId();
  const outputs: Record<string, string> = {};

  for (const zoneConfig of zoneHardening) {
    const zoneId = await resolveZoneId(accountId, zoneConfig.name);
    outputs[`${zoneConfig.prefix}ZoneId`] = zoneId;

    for (const setting of zoneSettings) {
      new cloudflare.ZoneSetting(`${zoneConfig.prefix}${setting.name}`, {
        zoneId,
        settingId: setting.settingId,
        value: setting.value,
      });
    }
  }

  return outputs;
}

async function configureBingeRedirects(stage: Stage) {
  if (stage !== "production") {
    return {};
  }

  const accountId = resolveAccountId();
  const zoneId = await resolveZoneId(accountId, readEnvironment("BINGE_PRODUCTION_DOMAIN"));
  const scriptName = "chill-web-binge-redirect";

  const redirectWorker = new cloudflare.WorkersScript("BingeRedirectWorker", {
    accountId,
    compatibilityDate: "2026-05-19",
    scriptName,
    content: `
addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  url.protocol = "https:";
  url.hostname = "${surfaces.app.domain.production.name}";
  event.respondWith(Response.redirect(url.toString(), 301));
});
`.trim(),
  });

  const routes: Record<string, string> = {};
  for (const domain of bingeRedirectDomains) {
    const name = domain.replace(/[^a-zA-Z0-9]/g, "");
    new cloudflare.WorkersRoute(
      `BingeRedirect${name}`,
      {
        zoneId,
        pattern: `${domain}/*`,
        script: scriptName,
      },
      {
        dependsOn: [redirectWorker],
      },
    );
    routes[domain] = `https://${surfaces.app.domain.production.name}`;
  }

  return routes;
}

export default $config({
  app(input) {
    const surface = resolveSurface();
    const stage = resolveStage(input.stage);
    if (surface === "zones" && stage !== "staging") {
      throw new Error("WEB_DEPLOY_TARGET=zones must use SST stage staging");
    }
    if (surface === "redirects" && stage !== "production") {
      throw new Error("WEB_DEPLOY_TARGET=redirects must use SST stage production");
    }

    return {
      name: `chill-web-${surface === "app" ? "chill" : surface}`,
      home: "local",
      providers: {
        cloudflare: "6.15.0",
      },
      protect: stage === "production",
      removal: stage === "production" ? "retain" : "retain-all",
    };
  },
  async run() {
    const surface = resolveSurface();
    const stage = resolveStage($app.stage);

    if (surface === "zones") {
      const zones = await configureZoneHardening();

      return {
        app: surface,
        stage,
        zones,
      };
    }
    if (surface === "redirects") {
      const redirects = await configureBingeRedirects(stage);

      return {
        app: surface,
        stage,
        redirects,
      };
    }

    const config = surfaces[surface];

    const site = new sst.cloudflare.StaticSiteV2("Web", {
      path: config.path,
      domain: resolveStaticSiteDomain(surface, stage),
      notFound: "single-page-application",
    });

    return {
      app: surface,
      stage,
      url: site.url,
    };
  },
});
