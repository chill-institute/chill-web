import { useSyncExternalStore } from "react";

import {
  getSystemThemeServerSnapshot,
  getSystemThemeSnapshot,
  getThemeServerSnapshot,
  getThemeSnapshot,
  isThemePreference,
  setThemeStore,
  subscribeSystemTheme,
  subscribeTheme,
} from "@/ui/hooks/theme-store";

export { isThemePreference };

function useSystemTheme() {
  return useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getSystemThemeServerSnapshot,
  );
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const systemDark = useSystemTheme();

  return { theme, setTheme: setThemeStore, systemDark };
}
