import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/movies/$id")({
  component: () => null,
});
