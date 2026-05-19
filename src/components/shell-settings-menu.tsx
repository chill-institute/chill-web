import { useState } from "react";
import { Settings } from "lucide-react";

import { SettingsPanel } from "@/components/settings-panel";
import { SettingsModal } from "@/ui/components/settings-modal";

export function ShellSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="settings"
        className="text-fg-3 hover-hover:hover:text-fg-1 hover-hover:hover:bg-hover focus-visible:ring-ring-focus focus-visible:ring-offset-surface inline-flex size-7 cursor-pointer items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <Settings className="size-3.5 shrink-0" aria-hidden="true" />
      </button>
      <SettingsModal
        open={open}
        onOpenChange={setOpen}
        description="Adjust your chill preferences, download folder, and search filters."
      >
        <SettingsPanel />
      </SettingsModal>
    </>
  );
}
