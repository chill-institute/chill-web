import type { ComponentProps, ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "./ui/drawer";
import { useIsDesktop } from "../hooks/use-is-desktop";

type ResponsiveModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  desktopContentClassName?: string;
  desktopContentVariant?: ComponentProps<typeof DialogContent>["variant"];
  drawerContentClassName?: string;
  drawerContentVariant?: ComponentProps<typeof DrawerContent>["variant"];
  showCloseButton?: boolean;
  drawerDirection?: "bottom" | "top" | "left" | "right";
  drawerProps?: {
    modal?: boolean;
    shouldScaleBackground?: boolean;
  };
  children: ReactNode;
};

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  desktopContentClassName,
  desktopContentVariant,
  drawerContentClassName,
  drawerContentVariant,
  showCloseButton = false,
  drawerDirection = "bottom",
  drawerProps,
  children,
}: ResponsiveModalProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={showCloseButton}
          variant={desktopContentVariant}
          className={desktopContentClassName}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="sr-only">{description}</DialogDescription>
          ) : null}
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={open}
      direction={drawerDirection}
      onOpenChange={onOpenChange}
      modal={drawerProps?.modal ?? true}
      shouldScaleBackground={drawerProps?.shouldScaleBackground ?? false}
    >
      <DrawerContent variant={drawerContentVariant} className={drawerContentClassName}>
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {description ? (
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
        ) : null}
        {children}
      </DrawerContent>
    </Drawer>
  );
}
