import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { AuthPage } from "@/ui/components/auth-page";

import { useAuth } from "../auth";
import { signOutSearchSchema, validateSignOutSearch } from "@/routes/-search-params";

export const signOutRouteOptions = {
  validateSearch: signOutSearchSchema,
  component: SignOutPage,
};

function SignOutPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { error } = useRouterState({
    select: (state) => validateSignOutSearch(state.location.search),
  });

  useEffect(() => {
    signOut();
    void navigate({
      to: "/sign-in",
      search: {
        error,
        callbackUrl: undefined,
      },
      replace: true,
    });
  }, [signOut, navigate, error]);

  return (
    <AuthPage title="signing you out">
      <div className="text-fg-2 flex items-center gap-2 text-sm">
        <Loader className="motion-safe:animate-spin" />
        <span>clearing your session…</span>
      </div>
    </AuthPage>
  );
}
