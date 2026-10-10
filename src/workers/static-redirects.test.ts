import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const publicDir = new URL("../../public/", import.meta.url);

function staticRedirects() {
  return readFileSync(new URL("_redirects", publicDir), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [from, to, status = "302"] = line.split(/\s+/);
      return { from, to, status };
    });
}

describe("static redirects", () => {
  it("sends the legacy security.txt path to the only security.txt", () => {
    expect(staticRedirects()).toContainEqual({
      from: "/security.txt",
      to: "/.well-known/security.txt",
      status: "301",
    });
    expect(existsSync(new URL(".well-known/security.txt", publicDir))).toBe(true);
    expect(existsSync(new URL("security.txt", publicDir))).toBe(false);
  });
});
