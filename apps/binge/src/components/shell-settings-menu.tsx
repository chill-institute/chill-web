import { useState } from "react";

import { SettingsPanel } from "@/components/settings-panel";
import { SettingsModal, SettingsModalTrigger } from "@chill-institute/ui/components/settings-modal";

export function ShellSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsModalTrigger compact onClick={() => setOpen(true)} />
      <SettingsModal
        open={open}
        onOpenChange={setOpen}
        description="Adjust your binge preferences, download folder, and home page visibility."
      >
        <SettingsPanel />
      </SettingsModal>
    </>
  );
}
