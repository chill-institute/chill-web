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
const appProductionNextDomain = `next.${app.domain.production.name}`;
const bingeProductionNextDomain = `next.${bingeProductionDomain}`;

const redirectDnsRecords = [
  {
    zoneName: app.domain.production.name,
    domain: appProductionNextDomain,
    target: app.domain.production.name,
    resourceName: "ChillNextDnsRecord",
  },
  {
    zoneName: bingeProductionDomain,
    domain: bingeProductionNextDomain,
    target: bingeProductionDomain,
    resourceName: "BingeNextDnsRecord",
  },
] as const;

const redirectRouteGroups = [
  {
    zoneName: app.domain.production.name,
    domains: [appProductionRedirectDomain, appProductionNextDomain],
    resourcePrefix: "ChillRedirect",
  },
  {
    zoneName: bingeProductionDomain,
    domains: [bingeProductionDomain, bingeProductionRedirectDomain, bingeProductionNextDomain],
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
type Stage = "production";
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
type DnsRecordArgs = {
  zoneId: string;
  name: string;
  type: "CNAME";
  content: string;
  ttl: number;
  proxied: boolean;
  comment?: string;
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
  DnsRecord: new (name: string, args: DnsRecordArgs) => unknown;
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
  if (stage === "production") {
    return stage;
  }

  throw new Error("SST stage must be production");
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

function resolveStaticSiteDomain(): StaticSiteV2Args["domain"] {
  return app.domain.production;
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

async function configureRedirects(stage: Stage) {
  if (stage !== "production") {
    return {};
  }

  const accountId = resolveAccountId();
  const scriptName = "chill-web-binge-redirect";
  const dnsRecordDeps: Record<string, unknown> = {};
  const dnsRecords: Record<string, string> = {};

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

  for (const record of redirectDnsRecords) {
    const zoneId = await resolveZoneId(accountId, record.zoneName);
    const dnsRecord = new cloudflare.DnsRecord(record.resourceName, {
      zoneId,
      name: record.domain,
      type: "CNAME",
      content: record.target,
      ttl: 1,
      proxied: true,
      comment: "Managed by chill-web production redirects",
    });
    dnsRecordDeps[record.domain] = dnsRecord;
    dnsRecords[record.domain] = record.target;
  }

  const routes: Record<string, string> = {};
  for (const group of redirectRouteGroups) {
    const zoneId = await resolveZoneId(accountId, group.zoneName);

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
          dependsOn: [redirectWorker, dnsRecordDeps[domain]].filter(Boolean),
        },
      );
      routes[domain] = `https://${app.domain.production.name}`;
    }
  }

  return {
    dnsRecords,
    routes,
  };
}

export default $config({
  app(input) {
    const target = resolveDeployTarget();
    const stage = resolveStage(input.stage);
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
      domain: resolveStaticSiteDomain(),
      notFound: "single-page-application",
    });

    return {
      target,
      stage,
      url: site.url,
    };
  },
});
