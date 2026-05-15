import { cva } from "class-variance-authority";

export const toggleVariants = cva(
  "inline-flex cursor-pointer items-center justify-center rounded text-sm font-medium transition-[transform,background-color,color] duration-fast ease-out hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 active:scale-[0.97] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-surface data-[pressed]:text-fg-1 data-[pressed]:shadow-press",
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
        default: "bg-transparent",
      },
    },
  },
);
