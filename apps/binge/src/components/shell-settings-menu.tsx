import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@chill-institute/ui/hooks/use-theme";
import { SettingsPanel } from "@/components/settings-panel";
import { SettingsModal, SettingsModalTrigger } from "@chill-institute/ui/components/settings-modal";
import { IconButton } from "@chill-institute/ui/components/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@chill-institute/ui/components/ui/dropdown-menu";

export function ShellSettingsMenu() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, systemDark } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && systemDark);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<IconButton aria-label="theme">{isDark ? <Sun /> : <Moon />}</IconButton>}
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun />
            <span>light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon />
            <span>dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor />
            <span>system</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
