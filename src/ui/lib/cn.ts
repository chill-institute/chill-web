import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom `--text-*` font-size tokens from styles.css. Without them,
// tailwind-merge reads `text-row` as a colour and drops it beside `text-fg-*`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs", "meta", "row"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
