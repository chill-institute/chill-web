import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type SettingsSectionProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

function SettingsSection({ title, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("flex flex-col gap-1.5", className)}>
      <p className="text-fg-1 m-0 font-sans text-sm font-medium">{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

export { SettingsSection };
