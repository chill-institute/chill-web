import { useState } from "react";
import { Settings } from "lucide-react";

import { SettingsPanel } from "@/components/settings-panel";
import { SettingsModal } from "@chill-institute/ui/components/settings-modal";
import { Button } from "@chill-institute/ui/components/ui/button";

export function ShellSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-fg-3 mt-2 [&_svg:not([class*=size-])]:size-3.5"
      >
        <Settings aria-hidden="true" />
        <span>settings</span>
      </Button>
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
