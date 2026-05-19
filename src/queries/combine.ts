import type { UseQueryResult } from "@tanstack/react-query";

type QueryLike<T = unknown> = Pick<UseQueryResult<T>, "data" | "error" | "status">;

type Combined<TData extends readonly unknown[]> =
  | { status: "pending" }
  | { status: "error"; error: Error }
  | { status: "success"; data: TData };

export function combineQueries<A, B>(
  a: QueryLike<A>,
  b: QueryLike<B>,
): Combined<[NonNullable<A>, NonNullable<B>]>;
export function combineQueries<A, B, C>(
  a: QueryLike<A>,
  b: QueryLike<B>,
  c: QueryLike<C>,
): Combined<[NonNullable<A>, NonNullable<B>, NonNullable<C>]>;
export function combineQueries(...queries: QueryLike[]): Combined<readonly NonNullable<unknown>[]> {
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
