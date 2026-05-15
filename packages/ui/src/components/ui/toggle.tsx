import { cva } from "class-variance-authority";

export const toggleVariants = cva(
  "inline-flex cursor-pointer items-center justify-center rounded text-sm font-medium transition-[transform,background-color,color] duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "px-1.5 py-1",
      },
      variant: {
        default:
          "bg-transparent hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 active:scale-[0.97] data-[pressed]:bg-surface data-[pressed]:text-fg-1 data-[pressed]:shadow-press",
        tab: "text-fg-3 bg-transparent hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 data-[pressed]:bg-hover data-[pressed]:text-fg-1",
      },
    },
  },
);
