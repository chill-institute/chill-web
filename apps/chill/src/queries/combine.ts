import type { UseQueryResult } from "@tanstack/react-query";

type Combined<TData extends readonly unknown[]> =
  | { status: "pending" }
  | { status: "error"; error: Error }
  | { status: "success"; data: TData };

export function combineQueries<A, B>(
  a: UseQueryResult<A>,
  b: UseQueryResult<B>,
): Combined<[NonNullable<A>, NonNullable<B>]>;
export function combineQueries<A, B, C>(
  a: UseQueryResult<A>,
  b: UseQueryResult<B>,
  c: UseQueryResult<C>,
): Combined<[NonNullable<A>, NonNullable<B>, NonNullable<C>]>;
export function combineQueries(
  ...queries: UseQueryResult[]
): Combined<readonly NonNullable<unknown>[]> {
  const errored = queries.find((q) => q.status === "error");
  if (errored) {
    return { status: "error", error: errored.error ?? new Error("Unknown query error") };
  }

  if (queries.some((q) => q.status === "pending")) {
    return { status: "pending" };
  }

  const data: NonNullable<unknown>[] = [];
  for (const q of queries) {
    if (q.data == null) {
      return { status: "error", error: new Error("combineQueries: success without data") };
    }
    data.push(q.data);
  }
  return { status: "success", data };
}
