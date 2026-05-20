import { useState } from "react";
import { Settings } from "lucide-react";

import { SettingsPanel } from "@/components/settings-panel";
import { IconButton } from "@/ui/components/icon-button";
import { SettingsModal } from "@/ui/components/settings-modal";

export function ShellSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label="settings"
        className="focus-visible:ring-offset-surface"
      >
        <Settings aria-hidden="true" />
      </IconButton>
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
