import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";

import { tabItemBaseClass } from "../../tabs";
import { cn } from "../../../lib/cn";

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        tabItemBaseClass,
        "data-[active]:bg-hover data-[active]:text-fg-1 hover-hover:hover:data-[active]:bg-hover",
        className,
      )}
      {...props}
    />
  );
}

export { TabsTrigger };
