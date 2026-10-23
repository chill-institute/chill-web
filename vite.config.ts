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

function resolveVersion() {
  const explicit = process.env.VITE_PUBLIC_VERSION?.trim();
  if (explicit) {
    return explicit;
  }

  try {
    const commitCount = execSync("git rev-list --count --first-parent HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return `0.0.${commitCount}`;
  } catch {
    return "dev";
  }
}

function resolvePublicSentryDsn() {
  if (process.env.VITE_PUBLIC_SENTRY_ENVIRONMENT) {
    return process.env.VITE_PUBLIC_SENTRY_DSN?.trim() ?? "";
  }

  return "";
}

const release = resolveRelease();
const version = resolveVersion();
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
    ignorePatterns: ["src/routeTree.gen.ts", "dist/**", ".agents/skills/**"],
  },
  lint: {
    plugins: ["eslint", "unicorn", "typescript", "oxc", "react"],
    jsPlugins: ["@shadcn/lint"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "react/exhaustive-deps": "error",
      "shadcn/no-restyle": [
        "error",
        {
          // Entrance animations are page choreography, not component styling.
          allow: ["layout", "animate-reveal"],
          contracts: [
            // Base UI triggers and closes render unstyled; their classes are the caller's.
            {
              pattern: "^(PopoverTrigger|PopoverClose|TooltipTrigger)$",
              allow: [
                "layout",
                "color",
                "typography",
                "spacing",
                "shape",
                "effects",
                "motion",
                "kbd",
              ],
            },
            // The focus ring offset has to match the surface the button sits on.
            { pattern: "^Button$", allow: ["layout", "animate-reveal", "ring-offset-*"] },
            { pattern: "^FieldGroup$", allow: ["layout", "gap"] },
          ],
        },
      ],
      "shadcn/no-raw-colors": "error",
      // Transition property lists name properties, not design values.
      "shadcn/no-arbitrary-values": ["error", { allow: ["layout", "transition"] }],
      "shadcn/no-inline-styles": "error",
      // `toaster` only marks Sonner's root for the `group-[.toaster]:` toast styles.
      "shadcn/no-unknown-classes": ["error", { allow: ["toaster"] }],
      "shadcn/require-static-classes": "error",
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
        files: ["src/ui/components/**"],
        rules: {
          "shadcn/no-restyle": "off",
          "shadcn/no-arbitrary-values": "off",
          "shadcn/require-static-classes": "off",
        },
      },
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
        sourcemap: false,
        cleanupOutdatedCaches: true,
        globPatterns: pwaPrecachePatterns,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/assets\//, /^\/\.well-known\//, /^\/security\.txt$/],
      },
    }),
    viteReact(),
    ...(sentrySourceMapPlugin ? [sentrySourceMapPlugin] : []),
  ],
  define: {
    "import.meta.env.VITE_PUBLIC_RELEASE": JSON.stringify(release),
    "import.meta.env.VITE_PUBLIC_VERSION": JSON.stringify(version),
    "import.meta.env.VITE_PUBLIC_SENTRY_DSN": JSON.stringify(publicSentryDsn),
  },
});
