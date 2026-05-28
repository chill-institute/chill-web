import { Loader } from "lucide-react";

import { AuthPage } from "@/ui/components/auth-page";

export function AuthSuccessFallback() {
  return (
    <AuthPage title="signing you in">
      <div className="text-fg-2 flex items-center gap-2 text-sm">
        <Loader className="motion-safe:animate-spin" />
        <span>finalizing your session…</span>
      </div>
    </AuthPage>
  );
}
