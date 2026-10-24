import { ResponsiveModal } from "@/ui/components/responsive-modal";
import { ModalCloseButton } from "@/ui/components/modal-close-button";
import { cn } from "@/ui/lib/cn";
import { formatBingeDate, type BingeSummary } from "@/binges/lib/types";

type Props = {
  binges: BingeSummary[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function BingePicker({ binges, activeId, onSelect, onClose }: Props) {
  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => !open && onClose()}
      title="All binges"
      description="Pick a binge to show on the home page"
      desktopContentClassName="fixed top-1/2 left-1/2 max-h-[min(calc(100dvh-48px),640px)] w-[min(100vw-1rem,480px)] -translate-x-1/2 -translate-y-1/2 gap-0 rounded-xl border border-border-strong bg-surface p-0 text-fg-1 shadow-modal"
      drawerContentClassName="max-h-[85dvh] overflow-hidden rounded-t-3xl border-x-0 border-t-0 border-b-0 bg-surface p-0 shadow-drawer"
    >
      <div className="flex min-h-0 flex-col">
        <div className="border-border-faint flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <h2 className="m-0 text-xl sm:text-2xl">all binges</h2>
          <ModalCloseButton onClick={onClose} aria-label="Close binge list" />
        </div>
        <ul className="m-0 min-h-0 list-none overflow-y-auto p-0">
          {binges.map((binge) => {
            const active = binge.id === activeId;
            return (
              <li key={binge.id} className="border-border-faint border-b last:border-b-0">
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(binge.id)}
                  className={cn(
                    "flex w-full cursor-pointer flex-col gap-0.5 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-focus sm:px-5",
                    active ? "bg-active" : "hover-hover:hover:bg-hover",
                  )}
                >
                  <span className="text-fg-1 font-serif text-lg leading-tight tracking-[-0.01em]">
                    {binge.title}
                  </span>
                  <span className="text-fg-3 text-xs tabular-nums">
                    {binge.itemCount} {binge.itemCount === 1 ? "title" : "titles"}
                    {binge.createdAt ? ` · ${formatBingeDate(binge.createdAt)}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </ResponsiveModal>
  );
}
