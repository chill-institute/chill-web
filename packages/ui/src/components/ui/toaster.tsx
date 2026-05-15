import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Subscribe to the resolved theme via the `dark` class on <html> — the same
// hook the rest of the app uses to flip surface tokens. Reading localStorage
// at mount only (the previous implementation) leaves Sonner stuck on the
// initial palette when the user toggles theme later.
function useResolvedToasterTheme(): "light" | "dark" {
  const [isDark, setIsDark] = useState(() => readIsDark());
  useEffect(() => {
    const update = () => setIsDark(readIsDark());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    update();
    return () => observer.disconnect();
  }, []);
  return isDark ? "dark" : "light";
}

function readIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function Toaster(props: ToasterProps) {
  const theme = useResolvedToasterTheme();
  return (
    <Sonner
      className="toaster group"
      theme={theme}
      toastOptions={{
        classNames: {
          actionButton: "group-[.toast]:bg-fg-1 group-[.toast]:text-fg-inverse lowercase",
          cancelButton: "group-[.toast]:bg-hover group-[.toast]:text-fg-3",
          description: "group-[.toast]:text-fg-3",
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-fg-1 group-[.toaster]:border-border-strong group-[.toaster]:shadow-press",
        },
      }}
      {...props}
    />
  );
}
