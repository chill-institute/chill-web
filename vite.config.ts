import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(() => {
  const usePolling = process.env.CHOKIDAR_USEPOLLING === "true";
  const pollingInterval = Number(process.env.CHOKIDAR_INTERVAL ?? "150");

  return {
    plugins: [
      TanStackRouterVite({
        target: "react",
        autoCodeSplitting: true,
      }),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      viteReact(),
    ],
    server: {
      watch: usePolling
        ? {
            usePolling: true,
            interval: Number.isFinite(pollingInterval) ? pollingInterval : 150,
          }
        : undefined,
    },
  };
});
