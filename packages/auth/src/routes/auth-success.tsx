import { redirect } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { AuthPage } from "@chill-institute/ui/components/auth-page";
import { UNKNOWN_AUTH_ERROR } from "@chill-institute/api/auth-errors";

import { consumeCallbackToken } from "../auth";

function AuthSuccessFallback() {
  return (
    <AuthPage title="signing you in">
      <div className="text-fg-2 flex items-center gap-2 text-sm">
        <Loader className="motion-safe:animate-spin" />
        <span>finalizing your session…</span>
      </div>
    </AuthPage>
  );
}

export const authSuccessRouteOptions = {
  beforeLoad: () => {
    const redirectPath = consumeCallbackToken();
    if (redirectPath) {
      throw redirect({ to: redirectPath });
    }
    throw redirect({
      to: "/sign-in",
      search: { error: UNKNOWN_AUTH_ERROR, callbackUrl: undefined },
    });
  },
  component: AuthSuccessFallback,
};
