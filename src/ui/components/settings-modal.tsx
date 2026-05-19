import type { ReactNode } from "react";

import { ModalCloseButton } from "./modal-close-button";
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
          ? "border-border-strong bg-surface text-fg-1 shadow-modal relative flex max-h-[min(85dvh,900px)] flex-col overflow-hidden rounded-xl border border-solid"
          : "bg-surface text-fg-1 relative flex max-h-[92dvh] flex-col overflow-hidden"
      }
    >
      <div className="border-border-faint flex shrink-0 items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <h3 className="m-0 text-2xl">settings</h3>
        <ModalCloseButton onClick={onClose} aria-label="Close settings" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
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
      drawerContentClassName="bg-surface shadow-drawer max-h-[92dvh] overflow-hidden rounded-t-3xl border-x-0 border-t-0 border-b-0 p-0"
    >
      <SettingsModalBody isDesktop={isDesktop} onClose={() => onOpenChange(false)}>
        {children}
      </SettingsModalBody>
    </ResponsiveModal>
  );
}
