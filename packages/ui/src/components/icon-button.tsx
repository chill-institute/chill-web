import type { ComponentProps } from "react";

import { Button } from "./ui/button";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "variant" | "size">;

function IconButton(props: IconButtonProps) {
  return <Button data-slot="icon-button" variant="ghost" size="icon" {...props} />;
}

export { IconButton };
