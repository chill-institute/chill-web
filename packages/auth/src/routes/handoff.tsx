import { redirect } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { AuthPage } from "@chill-institute/ui/components/auth-page";
import { UNKNOWN_AUTH_ERROR } from "@chill-institute/api/auth-errors";

import { consumeHandoffToken } from "../auth";

const PRODUCTION_HANDOFF_REFERRER_ORIGINS = ["https://chill.institute", "https://binge.institute"];

const STAGING_HANDOFF_REFERRER_ORIGINS = [
  "https://staging.chill.institute",
  "https://staging.binge.institute",
];

const LOCAL_HANDOFF_REFERRER_ORIGINS = [
  "http://localhost:58300",
  "http://localhost:58301",
  "http://localhost:58400",
  "http://localhost:58401",
];

export function getTrustedHandoffReferrerOrigins(targetOrigin = window.location.origin) {
  const { hostname, origin } = new URL(targetOrigin);
  if (LOCAL_HANDOFF_REFERRER_ORIGINS.includes(origin)) {
    return [
      ...PRODUCTION_HANDOFF_REFERRER_ORIGINS,
      ...STAGING_HANDOFF_REFERRER_ORIGINS,
      ...LOCAL_HANDOFF_REFERRER_ORIGINS,
    ];
  }
  if (hostname.startsWith("staging.")) {
    return STAGING_HANDOFF_REFERRER_ORIGINS;
  }
  return PRODUCTION_HANDOFF_REFERRER_ORIGINS;
}

function HandoffFallback() {
  return (
    <AuthPage title="connecting institute apps">
      <div className="text-fg-2 flex items-center gap-2 text-sm">
        <Loader className="motion-safe:animate-spin" />
        <span>bringing your session over…</span>
      </div>
    </AuthPage>
  );
}

export const handoffRouteOptions = {
  beforeLoad: () => {
    const redirectPath = consumeHandoffToken({
      trustedReferrerOrigins: getTrustedHandoffReferrerOrigins(),
    });
    if (redirectPath) {
      throw redirect({ to: redirectPath });
    }
    throw redirect({
      to: "/sign-in",
      search: { error: UNKNOWN_AUTH_ERROR, callbackUrl: undefined },
    });
  },
  component: HandoffFallback,
};
