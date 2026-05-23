import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";

import { tabsContainerClass } from "../../tabs";
import { cn } from "../../../lib/cn";

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsContainerClass, className)}
      {...props}
    />
  );
}

export { TabsList };
