import { defineConfig } from "vite-plus";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { VitePWA } from "vite-plugin-pwa";

function resolveRelease() {
  const explicit = process.env.VITE_PUBLIC_RELEASE?.trim();
  if (explicit) {
    return explicit;
  }

  const ciSha = process.env.CF_PAGES_COMMIT_SHA?.trim() || process.env.GITHUB_SHA?.trim();
  if (ciSha) {
    return ciSha.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function resolvePublicSentryDsn() {
  if (process.env.VITE_PUBLIC_SENTRY_ENVIRONMENT) {
    return process.env.VITE_PUBLIC_SENTRY_DSN?.trim() ?? "";
  }

  return "";
}

const release = resolveRelease();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.SENTRY_PROJECT?.trim();
const sentryEnvironment = process.env.VITE_PUBLIC_SENTRY_ENVIRONMENT?.trim();
const publicSentryDsn = resolvePublicSentryDsn();

function assertSentryDeployConfig() {
  if (process.env.CI !== "true" || !sentryEnvironment) {
    return;
  }

  const missing = [
    ["SENTRY_AUTH_TOKEN", sentryAuthToken],
    ["SENTRY_ORG", sentryOrg],
    ["SENTRY_PROJECT", sentryProject],
    ["VITE_PUBLIC_SENTRY_DSN", publicSentryDsn],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Sentry is enabled for ${sentryEnvironment}, but required deploy config is missing: ${missing.join(", ")}`,
    );
  }
}

function createSentrySourceMapPlugin() {
  assertSentryDeployConfig();

  if (!sentryAuthToken || !sentryOrg || !sentryProject) {
    return undefined;
  }

  return sentryVitePlugin({
    org: sentryOrg,
    project: sentryProject,
    authToken: sentryAuthToken,
    telemetry: false,
    release: {
      name: release,
      deploy: sentryEnvironment ? { env: sentryEnvironment } : undefined,
    },
    sourcemaps: {
      filesToDeleteAfterUpload: ["dist/**/*.map"],
    },
  });
}

const sentrySourceMapPlugin = createSentrySourceMapPlugin();
const uploadSentrySourceMaps = Boolean(sentrySourceMapPlugin);
const pwaPrecachePatterns = ["index.html", "assets/**/*"];

export default defineConfig({
  build: {
    sourcemap: uploadSentrySourceMaps ? "hidden" : false,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["src/routeTree.gen.ts", "dist/**"],
  },
  lint: {
    plugins: ["eslint", "unicorn", "typescript", "oxc", "react"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "react/exhaustive-deps": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["useEffect", "*"],
              message:
                "Use declarative React patterns first. For rare lifecycle work, use src/ui/hooks/use-effects; import named/type members from react instead of * as React.",
            },
          ],
        },
      ],
    },
    overrides: [
      {
        files: ["src/ui/hooks/use-effects.ts"],
        rules: {
          "no-restricted-imports": "off",
        },
      },
      {
        files: ["src/ui/hooks/use-sonner-toast.ts"],
        rules: {
          "no-restricted-imports": "off",
        },
      },
    ],
  },
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: pwaPrecachePatterns,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/assets\//],
      },
    }),
    viteReact(),
    ...(sentrySourceMapPlugin ? [sentrySourceMapPlugin] : []),
  ],
  define: {
    "import.meta.env.VITE_PUBLIC_RELEASE": JSON.stringify(release),
    "import.meta.env.VITE_PUBLIC_SENTRY_DSN": JSON.stringify(publicSentryDsn),
  },
});
