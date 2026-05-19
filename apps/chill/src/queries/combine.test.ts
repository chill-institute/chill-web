import { describe, expect, it } from "vite-plus/test";

import { combineQueries } from "./combine";

describe("combineQueries", () => {
  it("returns pending when any query is still pending", () => {
    expect(
      combineQueries(
        { status: "success", data: "ready", error: null },
        { status: "pending", data: undefined, error: null },
      ),
    ).toEqual({ status: "pending" });
  });

  it("returns the first query error before considering pending queries", () => {
    const error = new Error("settings failed");

    expect(
      combineQueries(
        { status: "error", data: undefined, error },
        { status: "pending", data: undefined, error: null },
      ),
    ).toEqual({ status: "error", error });
  });

  it("returns data in query order when every query succeeded", () => {
    const combined = combineQueries(
      { status: "success", data: "settings", error: null },
      { status: "success", data: { indexers: 2 }, error: null },
      { status: "success", data: ["results"], error: null },
    );

    expect(combined).toEqual({
      status: "success",
      data: ["settings", { indexers: 2 }, ["results"]],
    });
  });

  it("treats success without data as a contract error", () => {
    const combined = combineQueries(
      { status: "success", data: "settings", error: null },
      { status: "success", data: undefined, error: null },
    );

    expect(combined.status).toBe("error");
    expect(combined.status === "error" ? combined.error.message : "").toBe(
      "combineQueries: success without data",
    );
  });
});
