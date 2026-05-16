import { useState } from "react";
import { Settings } from "lucide-react";

import { SettingsPanel } from "@/components/settings-panel";
import { SettingsModal } from "@chill-institute/ui/components/settings-modal";

export function ShellSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-fg-3 hover-hover:hover:text-fg-1 focus-visible:ring-ring-focus focus-visible:ring-offset-surface mt-1 inline-flex cursor-pointer items-center gap-0.5 rounded-sm py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <Settings className="size-2.5 shrink-0" aria-hidden="true" />
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
