import type { ReactNode } from "react";
import { Settings, X } from "lucide-react";

import { Button } from "./ui/button";
import { IconButton } from "./icon-button";
import { ResponsiveModal } from "./responsive-modal";
import { useIsDesktop } from "../hooks/use-is-desktop";

type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  children: ReactNode;
};

function SettingsModalBody({
  isDesktop,
  onClose,
  children,
}: {
  isDesktop: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section
      data-page="settings"
      className={
        isDesktop
          ? "border-border-strong bg-surface text-fg-1 shadow-modal relative overflow-hidden rounded-xl border border-solid"
          : "bg-surface text-fg-1 relative overflow-hidden"
      }
    >
      <div className="border-border-faint flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <h3 className="m-0 text-2xl">settings</h3>
        <IconButton
          onClick={onClose}
          aria-label="Close settings"
          className="border-border-strong shadow-press rounded-full border"
        >
          <X />
        </IconButton>
      </div>
      <div className="max-h-[min(85dvh,900px)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
        {children}
      </div>
    </section>
  );
}

export function SettingsModal({ open, onOpenChange, description, children }: SettingsModalProps) {
  const isDesktop = useIsDesktop();
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description={description}
      desktopContentClassName="top-1/2 left-1/2 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 p-0"
      drawerContentClassName="bg-surface shadow-drawer overflow-hidden rounded-t-3xl border-x-0 border-t-0 border-b-0 p-0"
    >
      <SettingsModalBody isDesktop={isDesktop} onClose={() => onOpenChange(false)}>
        {children}
      </SettingsModalBody>
    </ResponsiveModal>
  );
}

export function SettingsModalTrigger({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <IconButton onClick={onClick} aria-label="Open settings">
        <Settings />
      </IconButton>
    );
  }

  return (
    <Button onClick={onClick}>
      <Settings />
      <span>settings</span>
    </Button>
  );
}
