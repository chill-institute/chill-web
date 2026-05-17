import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, Loader } from "lucide-react";

import { AuthPage } from "@chill-institute/ui/components/auth-page";
import { Button } from "@chill-institute/ui/components/ui/button";
import {
  ACCESS_DENIED_ERROR,
  SESSION_EXPIRED_ERROR,
  UNKNOWN_AUTH_ERROR,
} from "@chill-institute/api/auth-errors";
import { useGetPutioStartURL } from "@chill-institute/auth/api-context";
import { normalizeCallbackPath, prepareAuthSuccessURL, useAuth } from "@chill-institute/auth/auth";
import { publicLinks } from "@chill-institute/ui/lib/public-links";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
    callbackUrl: typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
  }),
  component: SignInPage,
});

function SignInPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
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
    return {
      message:
        "something went sideways while signing you in. try clearing cookies, or pop a different browser open.",
      type: UNKNOWN_AUTH_ERROR,
    };
  }, [search.error]);
  const visibleError = loading === "sign-in" ? null : error;

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const callback = search.callbackUrl?.trim();
    const normalized = callback ? normalizeCallbackPath(callback) : null;
    void navigate({ href: normalized ?? "/", replace: true });
  }, [auth.isAuthenticated, navigate, search.callbackUrl]);

  if (auth.isAuthenticated) {
    return (
      <AuthPage title="redirecting">
        <div className="text-fg-2 flex items-center gap-2 text-sm">
          <Loader className="motion-safe:animate-spin" />
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
        auth.setPendingCallbackURL(normalized);
      }
    }
    window.location.href = getPutioStartURL(prepareAuthSuccessURL(authSuccessURL));
  }

  return (
    <AuthPage title="welcome to binge.institute">
      {visibleError ? (
        <p className="text-fg-2 m-0 text-sm leading-relaxed">{visibleError.message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {visibleError?.actionURL ? (
          <Button
            disabled={loading === "help"}
            onClick={() => {
              setLoading("help");
              window.location.href = visibleError.actionURL ?? publicLinks.about;
            }}
          >
            {loading === "help" ? <Loader className="motion-safe:animate-spin" /> : null}
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
            <Loader className="motion-safe:animate-spin" />
          ) : (
            <ExternalLink />
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

      <div className="text-fg-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono text-2xs leading-relaxed">
        <span>not affiliated with put.io</span>
        <nav aria-label="external links" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {[
            { label: "about", href: publicLinks.about },
            { label: "guides", href: publicLinks.guides },
            { label: "github", href: publicLinks.github },
          ].map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden="true" className="text-fg-4">
                  ·
                </span>
              ) : null}
              <a
                href={link.href}
                rel="noreferrer noopener"
                target="_blank"
                className="hover-hover:hover:text-fg-1 inline-flex items-center gap-0.5"
              >
                <span>{link.label}</span>
                <ArrowUpRight className="size-3" strokeWidth={1.25} aria-hidden="true" />
              </a>
            </span>
          ))}
        </nav>
      </div>
    </AuthPage>
  );
}
