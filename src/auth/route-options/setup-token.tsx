import { useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

import { AuthPage } from "@/ui/components/auth-page";
import { CopyButton } from "@/ui/components/copy-button";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";

import { readCurrentCallbackPath, useAuth } from "../auth";

function SetupTokenPage() {
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
    <AuthPage
      title="Setup token"
      description="Connect the chilly CLI, the MCP server, or your own scripts to this account."
    >
      <div className="border-warn-border bg-warn-bg text-warn-text flex items-start gap-3 rounded border px-4 py-3 text-sm leading-[1.25]">
        <span className="flex h-[1.25em] shrink-0 items-center">
          <ShieldAlert className="size-4" />
        </span>
        <p className="m-0">
          Treat this token like a password. Anyone with it can act as your account until you sign
          out or replace it.
        </p>
      </div>

      <ul className="text-fg-3 m-0 flex list-disc flex-col gap-1 pl-5 text-sm leading-[1.25]">
        <li>
          <span className="text-fg-1 font-medium">chilly CLI:</span> run{" "}
          <span className="text-fg-1 font-medium">chilly auth login</span> and paste the token.
        </li>
        <li>
          <span className="text-fg-1 font-medium">MCP server or scripts:</span> send it as an{" "}
          <span className="text-fg-1 font-medium">Authorization: Bearer</span> header.
        </li>
      </ul>

      <FieldGroup className="gap-2">
        <Field>
          <FieldLabel htmlFor="setup-token" className="text-fg-1 text-sm font-medium md:text-base">
            Setup token
          </FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="setup-token"
              readOnly
              type={revealed ? "text" : "password"}
              value={auth.authToken}
              className="flex-1"
              aria-label="Setup token"
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

export const setupTokenRouteOptions = {
  component: SetupTokenPage,
};
