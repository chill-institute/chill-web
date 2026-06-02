import { useEffect, type EffectCallback } from "react";

export function useMountEffect(effect: EffectCallback): void {
  // eslint-disable-next-line react/exhaustive-deps
  useEffect(effect, []);
}
