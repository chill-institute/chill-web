import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ExternalLink, Loader } from "lucide-react";

import { AuthPage } from "@/ui/components/auth-page";
import { Button } from "@/ui/components/ui/button";
import {
  ACCESS_DENIED_ERROR,
  AUTH_FLOW_EXPIRED_ERROR,
  OAUTH_DENIED_ERROR,
  OAUTH_EXCHANGE_FAILED_ERROR,
  PUTIO_UNAVAILABLE_ERROR,
  PUTIO_VERIFICATION_FAILED_ERROR,
  SESSION_EXPIRED_ERROR,
  UNKNOWN_AUTH_ERROR,
} from "@/api/auth-errors";
import { useGetPutioStartURL } from "@/auth/api-context";
import {
  authCallbackHref,
  clearPendingAuthRedirectSearch,
  consumeCallbackFailureAuthReset,
  normalizeCallbackPath,
} from "@/auth/auth-storage";
import { prepareAuthSuccessURL, useAuth } from "@/auth/auth";
import { publicLinks } from "@/ui/lib/public-links";

export function SignInPage() {
  const { isAuthenticated, setPendingCallbackURL, signOut } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/sign-in" });
  const getPutioStartURL = useGetPutioStartURL();
  const [loading, setLoading] = useState<null | "help" | "sign-in">(null);
  const authSuccessURL = useMemo(
    () => new URL("/auth/success", window.location.origin).toString(),
    [],
  );

  const error = useMemo(() => {
    if (!search.error) {
      return null;
    }
    if (search.error === ACCESS_DENIED_ERROR) {
      return {
        actionLabel: "learn more",
        actionURL: publicLinks.about,
        message:
          "the institute is an exclusive extension for put.io users — it needs an active put.io membership to work.",
        type: ACCESS_DENIED_ERROR,
      };
    }
    if (search.error === SESSION_EXPIRED_ERROR) {
      return {
        message: "your session expired. sign in again to keep going.",
        type: SESSION_EXPIRED_ERROR,
      };
    }
    if (search.error === OAUTH_DENIED_ERROR) {
      return {
        message: "put.io sign-in was cancelled. try again whenever you're ready.",
        type: OAUTH_DENIED_ERROR,
      };
    }
    if (search.error === AUTH_FLOW_EXPIRED_ERROR) {
      return {
        message: "that sign-in link expired. start again to reconnect put.io.",
        type: AUTH_FLOW_EXPIRED_ERROR,
      };
    }
    if (search.error === OAUTH_EXCHANGE_FAILED_ERROR) {
      return {
        message: "put.io did not finish the sign-in handshake. try again in a moment.",
        type: OAUTH_EXCHANGE_FAILED_ERROR,
      };
    }
    if (search.error === PUTIO_UNAVAILABLE_ERROR) {
      return {
        message: "we could not reach put.io to verify your account. try again shortly.",
        type: PUTIO_UNAVAILABLE_ERROR,
      };
    }
    if (search.error === PUTIO_VERIFICATION_FAILED_ERROR) {
      return {
        actionLabel: "learn more",
        actionURL: publicLinks.about,
        message:
          "put.io did not confirm an active account for this sign-in. the institute needs an active put.io membership to work.",
        type: PUTIO_VERIFICATION_FAILED_ERROR,
      };
    }
    return {
      message:
        "something went sideways while signing you in. try clearing cookies, or pop a different browser open.",
      type: UNKNOWN_AUTH_ERROR,
    };
  }, [search.error]);
  const visibleError = loading === "sign-in" ? null : error;

  useEffect(() => {
    clearPendingAuthRedirectSearch();
  }, []);

  useEffect(() => {
    if (!search.error) return;
    const shouldResetAuth = consumeCallbackFailureAuthReset();
    if (shouldResetAuth && isAuthenticated) {
      signOut();
    }
  }, [isAuthenticated, search.error, signOut]);

  useEffect(() => {
    if (!isAuthenticated || search.error) return;
    void navigate({ href: authCallbackHref(search.callbackUrl), replace: true });
  }, [isAuthenticated, navigate, search.callbackUrl, search.error]);

  if (isAuthenticated && !error) {
    return (
      <AuthPage title="redirecting">
        <div className="text-fg-2 flex items-center gap-2 text-sm">
          <Loader className="motion-safe:animate-spin" data-icon="inline-start" />
          <span>taking you to the institute…</span>
        </div>
      </AuthPage>
    );
  }

  function startSignIn() {
    setLoading("sign-in");
    const callback = search.callbackUrl?.trim();
    if (callback) {
      const normalized = normalizeCallbackPath(callback);
      if (normalized) {
        setPendingCallbackURL(normalized);
      }
    }
    window.location.href = getPutioStartURL(prepareAuthSuccessURL(authSuccessURL));
  }

  return (
    <AuthPage title="Welcome to The Institute">
      {visibleError ? (
        <p className="text-fg-2 m-0 text-sm leading-relaxed">{visibleError.message}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {visibleError?.actionURL ? (
          <Button
            disabled={loading === "help"}
            onClick={() => {
              setLoading("help");
              window.location.href = visibleError.actionURL ?? publicLinks.about;
            }}
          >
            {loading === "help" ? (
              <Loader className="motion-safe:animate-spin" data-icon="inline-start" />
            ) : null}
            {visibleError.actionLabel ?? "learn more"}
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="hero"
          disabled={loading === "sign-in"}
          onClick={startSignIn}
        >
          {loading === "sign-in" ? (
            <Loader className="motion-safe:animate-spin" data-icon="inline-start" />
          ) : (
            <ExternalLink data-icon="inline-start" />
          )}
          <span>
            {visibleError?.type === SESSION_EXPIRED_ERROR
              ? "sign in again"
              : visibleError
                ? "try again"
                : "sign in with put.io"}
          </span>
        </Button>
      </div>
    </AuthPage>
  );
}
