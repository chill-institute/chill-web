import type { PropsWithChildren } from "react";

export function ResponsiveBox({ children }: PropsWithChildren) {
  return <div className="px-4 xl:px-0 w-full max-w-5xl mx-auto">{children}</div>;
}
