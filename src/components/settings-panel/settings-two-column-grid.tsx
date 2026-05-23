import type { ReactNode } from "react";

function SettingsTwoColumnGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>;
}

export { SettingsTwoColumnGrid };
