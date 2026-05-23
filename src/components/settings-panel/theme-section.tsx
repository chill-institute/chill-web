import { NativeSelect } from "@/ui/components/ui/native-select";
import { SettingsSection } from "@/ui/components/settings-section";
import { isThemePreference } from "@/ui/hooks/use-theme";

function ThemeSection({
  theme,
  setTheme,
  systemDark,
}: {
  theme: string;
  setTheme: (theme: "light" | "dark" | "system") => void;
  systemDark: boolean;
}) {
  return (
    <SettingsSection title="User-interface theme">
      <NativeSelect
        aria-label="User-interface theme"
        name="theme"
        value={theme}
        onChange={(event) => {
          const { value } = event.currentTarget;
          if (isThemePreference(value)) {
            setTheme(value);
          }
        }}
      >
        <option value="system">{`System (${systemDark ? "dark" : "light"})`}</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </NativeSelect>
    </SettingsSection>
  );
}

export { ThemeSection };
