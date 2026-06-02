import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { AuthPage } from "@/ui/components/auth-page";
import { useMountEffect } from "@/ui/hooks/use-effects";

import { useAuth } from "../auth";

export function SignOutPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { error } = useSearch({ from: "/sign-out" });

  useMountEffect(() => {
    signOut();
    void navigate({
      to: "/sign-in",
      search: {
        error,
        callbackUrl: undefined,
      },
      replace: true,
    });
  });

  return (
    <AuthPage title="signing you out">
      <div className="text-fg-2 flex items-center gap-2 text-sm">
        <Loader className="motion-safe:animate-spin" />
        <span>clearing your session…</span>
      </div>
    </AuthPage>
  );
}
