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
    options: {
      typeAware: true,
      typeCheck: true,
    },
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
      injectRegister: "script-defer",
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{css,html,ico,js,png,svg,woff2}"],
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
