import { ArrowUpRight, X } from "lucide-react";

import { Button } from "@chill-institute/ui/components/ui/button";
import { IconButton } from "@chill-institute/ui/components/icon-button";
import { ResponsiveModal } from "@chill-institute/ui/components/responsive-modal";
import { useUserMessages } from "@/components/user-messages-provider";

export function UserMessageModal() {
  const {
    currentMessage: message,
    dismissCurrentMessage,
    activateCurrentMessageAction,
  } = useUserMessages();
  const open = message !== null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          dismissCurrentMessage();
        }
      }}
      title={message?.title ?? "Update"}
      description={message?.description}
      desktopContentClassName="border-border-strong bg-surface text-fg-1 shadow-modal top-1/2 left-1/2 w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-0"
      drawerContentClassName="bg-surface text-fg-1 shadow-drawer overflow-hidden rounded-t-3xl border-0 p-0"
    >
      {message ? (
        <div className="relative flex flex-col gap-5 px-5 pt-6 pb-6 sm:gap-6 sm:px-6 sm:pt-7 sm:pb-6">
          <IconButton
            onClick={dismissCurrentMessage}
            aria-label="Close update"
            className="border-border-strong shadow-press absolute top-3 right-3 rounded-full border"
          >
            <X />
          </IconButton>
          <div className="flex flex-col items-center gap-4">
            {message.sender ? (
              <div className="flex justify-center">
                {message.sender.avatarSrc ? (
                  <div className="relative w-fit shrink-0 rotate-[-3deg]">
                    <img
                      src={message.sender.avatarSrc}
                      alt={message.sender.avatarAlt}
                      className="shadow-press aspect-square w-[120px] rounded-md object-cover outline-1 -outline-offset-1 outline-white/10"
                    />
                    <span className="border-border-strong bg-surface text-fg-1 shadow-press absolute -right-4 -bottom-2 rotate-3 rounded-sm border px-2 py-0.5 font-mono text-[10px] leading-4 whitespace-nowrap uppercase">
                      very official
                    </span>
                  </div>
                ) : (
                  <div className="border-border-strong bg-surface-2 text-fg-2 shadow-press flex aspect-square w-[120px] shrink-0 items-center justify-center rounded-md border font-mono text-xl">
                    {message.sender.name.slice(0, 1)}
                  </div>
                )}
                {message.sender.banner ? (
                  <div className="border-border-strong bg-surface-2 text-fg-1 shadow-press flex h-24 min-w-0 items-center rounded-md border px-3 py-2 font-mono text-xs leading-5 whitespace-pre uppercase">
                    <span>{message.sender.banner}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex w-full flex-col items-center gap-4">
              <h2 className="m-0 text-center text-3xl" aria-hidden="true">
                {message.title}
              </h2>
              <div className="text-fg-2 flex w-full flex-col gap-3 text-center text-base/7 sm:text-sm/6">
                <p className="text-fg-1 m-0">{message.description}</p>
                {message.body.map((paragraph) => (
                  <p key={paragraph} className="m-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-1 sm:pt-0">
            <Button variant="primary" onClick={activateCurrentMessageAction}>
              <span>{message.primaryAction.label}</span>
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </ResponsiveModal>
  );
}
