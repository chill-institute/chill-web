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
        className="text-fg-3 hover-hover:hover:text-fg-1 mt-2 inline-flex cursor-pointer items-center gap-[5px] px-0 py-[3px] text-xs whitespace-nowrap"
      >
        <Settings className="size-3.5" aria-hidden="true" />
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
