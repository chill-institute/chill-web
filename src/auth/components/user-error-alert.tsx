import { AlertCircle, LogIn, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";

import { useGetPutioStartURL } from "../api-context";
import { prepareSignInAgainURL } from "../auth";
import { localizeError, type LocalizedErrorRecoveryAction } from "../errors";

type UserErrorAlertProps = {
  error: unknown;
  className?: string;
};

function renderAction(action: LocalizedErrorRecoveryAction, onSignInAgain: () => void) {
  switch (action.kind) {
    case "retry":
      return (
        <Button
          key={action.kind}
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw />
          {action.label}
        </Button>
      );
    case "sign-in-again":
      return (
        <Button key={action.kind} size="sm" onClick={onSignInAgain}>
          <LogIn />
          {action.label}
        </Button>
      );
  }

  const exhaustive: never = action;
  throw new Error(`Unhandled recovery action: ${JSON.stringify(exhaustive)}`);
}

export function UserErrorAlert({ error, className }: UserErrorAlertProps) {
  const getPutioStartURL = useGetPutioStartURL();
  const localized = localizeError(error);
  const suggestion = localized.recoverySuggestion;

  const handleSignInAgain = () => {
    window.location.href = prepareSignInAgainURL(getPutioStartURL);
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle />
      <AlertTitle>{localized.message}</AlertTitle>
      {suggestion?.description ? (
        <AlertDescription>{suggestion.description}</AlertDescription>
      ) : null}
      {suggestion?.actions?.length ? (
        <div className="col-start-2 mt-2 flex flex-wrap gap-2">
          {suggestion.actions.map((action) => renderAction(action, handleSignInAgain))}
        </div>
      ) : null}
    </Alert>
  );
}
