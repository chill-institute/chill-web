import { InstituteExternalLinks } from "@/ui/components/institute-footer";

function SettingsFooter() {
  return (
    <div className="flex flex-col items-center gap-3 text-center text-xs sm:flex-row sm:justify-between sm:gap-3 sm:text-left">
      <InstituteExternalLinks ariaLabel="contact" className="text-fg-3" />
      <span className="text-fg-3 shrink-0 text-center sm:text-left">
        release: {import.meta.env.VITE_PUBLIC_RELEASE ?? "dev"}
      </span>
    </div>
  );
}

export { SettingsFooter };
