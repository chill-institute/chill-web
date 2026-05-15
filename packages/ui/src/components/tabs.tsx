import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "../lib/cn";

export const tabsContainerClass = "inline-flex items-center gap-1";

export const tabItemBaseClass =
  "text-fg-3 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 motion-safe:ease-out motion-safe:duration-fast inline-flex h-7 cursor-pointer items-center gap-1.5 rounded bg-transparent px-2.5 text-sm motion-safe:transition-[color,background-color] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5";

export const tabItemActiveClass = "bg-hover text-fg-1 hover-hover:hover:bg-hover";

type TabsProps = {
  className?: string;
  children: ReactNode;
};

function Tabs({ className, children }: TabsProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLElement) || event.target.getAttribute("role") !== "tab") {
      return;
    }
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
    );
    const current = tabs.indexOf(event.target);
    if (current === -1) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowLeft") nextIndex = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "ArrowRight") nextIndex = (current + 1) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    next?.focus();
    next?.click();
  }
  return (
    <div
      data-slot="tabs"
      role="tablist"
      className={cn(tabsContainerClass, className)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

type TabProps = ComponentPropsWithoutRef<typeof ButtonPrimitive> & {
  active?: boolean;
};

function Tab({ active, className, ...props }: TabProps) {
  return (
    <ButtonPrimitive
      role="tab"
      aria-selected={active ?? false}
      tabIndex={active ? 0 : -1}
      data-active={active || undefined}
      className={cn(tabItemBaseClass, active && tabItemActiveClass, className)}
      {...props}
    />
  );
}

export { Tabs, Tab };
