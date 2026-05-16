import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";

import { useSearchDisplay } from "@/hooks/use-search-display";

const TABLE_ROW_SKELETON_SLOTS = Array.from({ length: 8 }, (_, i) => `row-${i}`);
const CARD_SKELETON_SLOTS = Array.from({ length: 4 }, (_, i) => `card-${i}`);
const metaSkeletonSlots = ["source", "size", "seeders", "age"];

function SearchResultCardLoading() {
  return (
    <div className="border-border-strong bg-surface my-4 overflow-hidden rounded border">
      <div className="px-6 py-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-2/5" />
        <div className="border-border-strong my-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-y py-2.5">
          {metaSkeletonSlots.map((slot) => (
            <Skeleton key={slot} className="h-3 w-14" />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </div>
  );
}

function SearchResultTableHeaderLoading() {
  return (
    <thead className="border-border-strong border-b">
      <tr>
        <th scope="col" className="pr-2 pb-1.5 text-left">
          <Skeleton className="h-5 w-56" />
        </th>
        <th scope="col" className="px-2 pb-1 text-center">
          <Skeleton className="mx-auto h-4 w-12" />
        </th>
        <th scope="col" className="px-2 pb-1 text-center">
          <Skeleton className="mx-auto h-4 w-8" />
        </th>
        <th scope="col" className="px-2 pb-1 text-center">
          <Skeleton className="mx-auto h-4 w-12" />
        </th>
        <th scope="col" className="px-2 pb-1 text-center">
          <Skeleton className="mx-auto h-4 w-7" />
        </th>
        <th scope="col" className="px-2 pb-1 text-center">
          <Skeleton className="mx-auto h-4 w-6" />
        </th>
        <th scope="col" className="pb-1 text-center">
          <Skeleton className="mx-auto h-4 w-5" />
        </th>
      </tr>
    </thead>
  );
}

function SearchResultRowLoading({ detailed }: { detailed: boolean }) {
  return (
    <tr className="border-border-faint border-b last:border-b-0">
      <td className="py-3.5 pr-2 pl-0 align-middle">
        <Skeleton className="h-4 w-full max-w-xl" />
        {detailed ? <Skeleton className="mt-1.5 h-3 w-48" /> : null}
      </td>
      <td className="px-2 py-3.5 text-center align-middle whitespace-nowrap">
        <Skeleton className="mx-auto h-4 w-12" />
      </td>
      <td className="px-2 py-3.5 text-center align-middle whitespace-nowrap">
        <Skeleton className="mx-auto h-4 w-14" />
      </td>
      <td className="px-2 py-3.5 text-center align-middle whitespace-nowrap">
        <Skeleton className="mx-auto h-4 w-10" />
      </td>
      <td className="px-2 py-3.5 text-center align-middle whitespace-nowrap">
        <Skeleton className="mx-auto h-4 w-14" />
      </td>
      <td className="px-2 py-3.5 text-center align-middle whitespace-nowrap">
        <Skeleton className="mx-auto h-7 w-7 rounded" />
      </td>
      <td className="w-[130px] py-3.5 pr-0 pl-1 align-middle whitespace-nowrap">
        <Skeleton className="h-7 w-[130px] rounded" />
      </td>
    </tr>
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
  const { mode } = useSearchDisplay();
  const detailed = mode === "detailed";
  return (
    <>
      <div className="mx-auto hidden w-full max-w-5xl lg:block">
        <table className="w-full min-w-full border-collapse">
          <SearchResultTableHeaderLoading />
          <tbody>
            {TABLE_ROW_SKELETON_SLOTS.map((slot) => (
              <SearchResultRowLoading key={slot} detailed={detailed} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="m-0 list-none p-0 lg:hidden" aria-label="Loading search results">
        {CARD_SKELETON_SLOTS.map((slot) => (
          <li key={slot}>
            <SearchResultCardLoading />
          </li>
        ))}
      </ul>
    </>
  );
}
