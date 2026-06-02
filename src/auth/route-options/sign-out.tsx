import { SignOutPage } from "@/auth/components/sign-out-page";

import { signOutSearchSchema } from "@/routes/-search-params";

export const signOutRouteOptions = {
  validateSearch: signOutSearchSchema,
  component: SignOutPage,
};
