import { Toaster as Sonner } from "sonner";

import { useResolvedTheme } from "../../hooks/use-resolved-theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  const theme = useResolvedTheme();
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
