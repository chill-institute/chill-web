import { defineConfig } from "vite-plus";
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

const release = resolveRelease();

export default defineConfig({
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
      },
    }),
    viteReact(),
  ],
  define: {
    "import.meta.env.VITE_PUBLIC_RELEASE": JSON.stringify(release),
  },
});
