import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type AuthPageProps = {
  title?: ReactNode;
  description?: ReactNode;
  hideBrand?: boolean;
  logoSrc?: string;
  className?: string;
  children: ReactNode;
};

function AuthPage({
  title,
  description,
  hideBrand = false,
  logoSrc = "/logo.png",
  className,
  children,
}: AuthPageProps) {
  const showHead = !hideBrand || title || description;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8 md:px-8">
      <div
        data-slot="auth-page"
        className={cn(
          "border-border-strong bg-surface shadow-press w-full max-w-[480px] overflow-hidden rounded-xl border",
          className,
        )}
      >
        {showHead ? (
          <div className="border-border-strong flex flex-col items-center justify-center gap-5 border-b px-7 py-6 text-center sm:gap-6">
            {hideBrand ? null : (
              <img
                src={logoSrc}
                width={64}
                height={64}
                alt=""
                className="border-border-strong size-16 rounded border sm:size-20"
              />
            )}
            <div className="min-w-0 w-full">
              {title ? (
                <h1 className="m-0 text-[1.625rem] leading-none sm:text-4xl">{title}</h1>
              ) : null}
              {description ? (
                <p className="text-fg-3 mt-2 text-sm leading-[1.2]">{description}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 px-7 py-6">{children}</div>
      </div>
    </div>
  );
}

export { AuthPage };
