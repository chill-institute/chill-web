import type { PropsWithChildren } from "react";

export function ResponsiveBox({ children }: PropsWithChildren) {
  return (
    <div className="px-4 mx-auto w-full max-w-sm md:max-w-2xl lg:max-w-5xl xl:px-0">{children}</div>
  );
}
