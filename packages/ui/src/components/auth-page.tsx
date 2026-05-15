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
          <div className="border-border-strong flex items-center gap-3.5 border-b px-7 py-6">
            {hideBrand ? null : (
              <img
                src={logoSrc}
                width={44}
                height={44}
                alt="logo"
                className="border-border-strong rounded border"
              />
            )}
            <div className="min-w-0 flex-1">
              {title ? <h1 className="m-0 truncate text-[1.625rem]">{title}</h1> : null}
              {description ? (
                <p className="text-fg-3 mt-1 font-serif text-sm italic">{description}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 px-7 pt-[22px] pb-[26px]">{children}</div>
      </div>
    </div>
  );
}

export { AuthPage };
