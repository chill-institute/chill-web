import { useState } from "react";

import { SettingsPanel } from "@/components/settings-panel";
import { SettingsModal } from "@chill-institute/ui/components/settings-modal";

export function ShellSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-fg-3 hover-hover:hover:text-fg-1 focus-visible:ring-ring-focus focus-visible:ring-offset-surface mt-2 inline-flex h-[var(--control-h)] cursor-pointer items-center rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <span>settings</span>
      </button>
      <SettingsModal
        open={open}
        onOpenChange={setOpen}
        description="Adjust your chill preferences, download folder, search filters, and result layout."
      >
        <SettingsPanel />
      </SettingsModal>
    </>
  );
}
