import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy address printed by older chilly and MCP releases.
export const Route = createFileRoute("/auth/mcp-token")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/chilly-token", replace: true });
  },
});
