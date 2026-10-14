import { readdirSync } from "node:fs";

const sourceMaps = readdirSync("dist", { recursive: true, encoding: "utf8" }).filter((file) =>
  file.endsWith(".map"),
);

if (sourceMaps.length > 0) {
  throw new Error(`Build contains source maps: ${sourceMaps.join(", ")}`);
}
