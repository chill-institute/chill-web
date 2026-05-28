import { createFileRoute } from "@tanstack/react-router";

import { SignInPage } from "@/auth/components/sign-in-page";
import { signInSearchSchema } from "@/routes/-search-params";

export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchSchema,
  component: SignInPage,
});
