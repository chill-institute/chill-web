import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { AuthPage } from "@chill-institute/ui/components/auth-page";

import { normalizeCallbackPath, readAuthTokenFromLocation, useAuth } from "../auth";

type DevRouteSearch = {
  callbackUrl?: string;
};

type DevRouteHash = {
  authToken: string;
  callbackUrl: null | string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateDevRouteSearch(search: unknown): DevRouteSearch {
  if (!isRecord(search)) return {};
  return {
    callbackUrl: typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
  };
}

function readDevRouteHash(): DevRouteHash {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    authToken: readAuthTokenFromLocation(window.location),
    callbackUrl: hash.get("callbackUrl"),
  };
}

export function DevRoute() {
  const { setAuthToken } = useAuth();
  const navigate = useNavigate();
  const { callbackUrl } = useRouterState({
    select: (state) => validateDevRouteSearch(state.location.search),
  });
  const hash = readDevRouteHash();
  const token = hash.authToken.trim();

  useEffect(() => {
    if (!token) {
      return;
    }

    setAuthToken(token);
    void navigate({
      href: normalizeCallbackPath(hash.callbackUrl ?? callbackUrl ?? null) ?? "/",
      replace: true,
    });
  }, [callbackUrl, hash.callbackUrl, navigate, setAuthToken, token]);

  if (!token) {
    return (
      <AuthPage title="dev auth">
        <p className="text-fg-2 m-0 text-sm">missing auth_token URL fragment.</p>
      </AuthPage>
    );
  }

  return (
    <AuthPage title="dev auth">
      <div className="text-fg-2 flex items-center gap-2 text-sm">
        <Loader className="motion-safe:animate-spin" />
        <span>bootstrapping local auth…</span>
      </div>
    </AuthPage>
  );
}
