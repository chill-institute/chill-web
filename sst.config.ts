function readEnvironment(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function readProductionDomainMode() {
  const mode = process.env.SST_PRODUCTION_DOMAIN_MODE?.trim() || "validation";
  if (mode === "validation" || mode === "apex") {
    return mode;
  }

  throw new Error("SST_PRODUCTION_DOMAIN_MODE must be validation or apex");
}

const surfaces = {
  chill: {
    domain: {
      staging: {
        name: readEnvironment("CHILL_STAGING_DOMAIN", "staging.chill.institute"),
      },
      production: {
        name: readEnvironment("CHILL_PRODUCTION_DOMAIN", "chill.institute"),
        validationName: readEnvironment(
          "CHILL_PRODUCTION_VALIDATION_DOMAIN",
          "next.chill.institute",
        ),
      },
    },
    path: "apps/chill/dist",
  },
  binge: {
    domain: {
      staging: {
        name: readEnvironment("BINGE_STAGING_DOMAIN", "staging.binge.institute"),
      },
      production: {
        name: readEnvironment("BINGE_PRODUCTION_DOMAIN", "binge.institute"),
        validationName: readEnvironment(
          "BINGE_PRODUCTION_VALIDATION_DOMAIN",
          "next.binge.institute",
        ),
      },
    },
    path: "apps/binge/dist",
  },
} as const;

const zoneHardening = [
  {
    name: surfaces.chill.domain.production.name,
    prefix: "Chill",
  },
  {
    name: surfaces.binge.domain.production.name,
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
type Surface = AppSurface | "zones";
type Stage = "staging" | "production";
type StaticSiteV2Args = {
  domain: {
    name: string;
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
};

function resolveSurface(): Surface {
  const surface = process.env.CHILL_WEB_APP;
  if (surface === "chill" || surface === "binge" || surface === "zones") {
    return surface;
  }

  throw new Error("CHILL_WEB_APP must be set to chill, binge, or zones");
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

  const config = surfaces[surface].domain.production;
  const mode = readProductionDomainMode();
  if (mode === "validation") {
    return {
      name: config.validationName,
    };
  }

  return {
    name: config.name,
  };
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

export default $config({
  app(input) {
    const surface = resolveSurface();
    const stage = resolveStage(input.stage);
    if (surface === "zones" && stage !== "staging") {
      throw new Error("CHILL_WEB_APP=zones must use SST stage staging");
    }

    return {
      name: `chill-web-${surface}`,
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
