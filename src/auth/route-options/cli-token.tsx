import { useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

import { AuthPage } from "@/ui/components/auth-page";
import { CopyButton } from "@/ui/components/copy-button";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";

import { readCurrentCallbackPath, useAuth } from "../auth";

function CliTokenPage() {
  const auth = useAuth();
  const callbackURL = readCurrentCallbackPath();
  const [revealed, setRevealed] = useState(false);

  if (!auth.isAuthenticated || !auth.authToken) {
    return (
      <Navigate
        to="/sign-in"
        search={{ error: undefined, callbackUrl: callbackURL ?? undefined }}
        replace
      />
    );
  }

  return (
    <AuthPage title="CLI token" description="Use this to sign in from the CLI.">
      <div className="border-warn-border bg-warn-bg text-warn-text flex items-start gap-3 rounded border px-4 py-3 text-sm leading-[1.25]">
        <span className="flex h-[1.25em] shrink-0 items-center">
          <ShieldAlert className="size-4" />
        </span>
        <p className="m-0">
          Treat this token like a password. Anyone with it can act as your account until you sign
          out or replace the token.
        </p>
      </div>

      <FieldGroup className="gap-2">
        <Field>
          <FieldLabel htmlFor="cli-token" className="text-fg-1 text-sm font-medium md:text-base">
            Access token
          </FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="cli-token"
              readOnly
              type={revealed ? "text" : "password"}
              value={auth.authToken}
              className="flex-1"
              aria-label="CLI auth token"
            />
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => setRevealed((current) => !current)}
            >
              {revealed ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
              <span>{revealed ? "hide" : "show"}</span>
            </Button>
            <CopyButton value={auth.authToken} className="shrink-0" />
          </div>
        </Field>
      </FieldGroup>
    </AuthPage>
  );
}

export const cliTokenRouteOptions = {
  component: CliTokenPage,
};
