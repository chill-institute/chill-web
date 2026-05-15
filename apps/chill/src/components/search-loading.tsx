import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";

const TABLE_ROW_SKELETON_SLOTS = Array.from({ length: 8 }, (_, i) => `row-${i}`);
const CARD_SKELETON_SLOTS = Array.from({ length: 4 }, (_, i) => `card-${i}`);

function SearchResultCardLoading() {
  return (
    <div className="border-border-strong bg-surface relative overflow-hidden rounded border border-solid">
      <div className="px-6 py-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
        <div className="my-3 flex flex-row items-center gap-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </div>
  );
}

function SearchResultRowLoading() {
  return (
    <div className="border-border-faint flex items-center gap-4 border-b py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-4 w-12 shrink-0" />
      <Skeleton className="h-4 w-14 shrink-0" />
      <Skeleton className="h-4 w-10 shrink-0" />
      <Skeleton className="h-4 w-14 shrink-0" />
      <Skeleton className="size-7 shrink-0 rounded" />
      <Skeleton className="h-7 w-[130px] shrink-0 rounded" />
    </div>
  );
}

export function FilterBarLoading() {
  return (
    <div className="flex flex-col gap-6 lg:items-center">
      <div className="flex flex-col items-start lg:items-center">
        <div className="flex flex-row items-center gap-x-3">
          <div className="flex flex-row gap-x-2">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-10" />
          </div>
          <div className="bg-border-hairline h-4 w-px" />
          <div className="flex flex-row gap-x-2">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-10" />
          </div>
          <div className="bg-border-hairline h-4 w-px" />
          <div className="flex flex-row gap-x-2">
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start lg:hidden lg:items-center">
        <div className="flex flex-row gap-x-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-10" />
        </div>
      </div>
    </div>
  );
}

export function SearchLoading() {
  return (
    <>
      <div className="mx-auto hidden w-full max-w-5xl lg:block">
        {TABLE_ROW_SKELETON_SLOTS.map((slot) => (
          <SearchResultRowLoading key={slot} />
        ))}
      </div>

      <div className="flex flex-col gap-y-4 lg:hidden">
        {CARD_SKELETON_SLOTS.map((slot) => (
          <SearchResultCardLoading key={slot} />
        ))}
      </div>
    </>
  );
}
