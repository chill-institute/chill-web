import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";

import { Button } from "@/ui/components/ui/button";
import { IconButton } from "@/ui/components/icon-button";
import { Field, FieldLabel } from "@/ui/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { normalizeQuery } from "@/lib/search";
import { useMountEffect } from "@/ui/hooks/use-effects";

export function ShellSearchForm({
  focusOnMount = false,
  initialQuery = "",
  label,
}: {
  focusOnMount?: boolean;
  initialQuery?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<{ base: string; value: string } | null>(null);
  const value = draft?.base === initialQuery ? draft.value : initialQuery;
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);

  function setInputFocused(next: boolean) {
    focusedRef.current = next;
    setFocused(next);
  }

  useMountEffect(() => {
    if (!focusOnMount) return;
    inputRef.current?.focus({ preventScroll: true });
  });

  useMountEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !focusedRef.current &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const target = event.target instanceof HTMLElement ? event.target : null;
        const tag = target?.tagName?.toLowerCase();
        const editable =
          tag === "input" || tag === "textarea" || target?.isContentEditable === true;
        if (editable) return;
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && focusedRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const isTouchDevice = useMemo(
    () =>
      typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    [],
  );

  const trailingAddon = useMemo(() => {
    if (value) {
      return (
        <InputGroupAddon align="inline-end">
          <IconButton
            type="button"
            aria-label="Clear search query"
            onClick={() => {
              setDraft({ base: initialQuery, value: "" });
              inputRef.current?.focus();
            }}
          >
            <X />
          </IconButton>
        </InputGroupAddon>
      );
    }
    if (focused || isTouchDevice) {
      return null;
    }
    return (
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                aria-label="Focus search input"
                className="kbd cursor-default"
                onClick={() => inputRef.current?.focus()}
                type="button"
              >
                /
              </button>
            }
          />
          <TooltipContent>
            <p>Press / to focus, esc to cancel</p>
          </TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    );
  }, [focused, isTouchDevice, value, initialQuery]);

  return (
    // eslint-disable-next-line react-doctor/no-prevent-default -- progressive enhancement via action+method
    <form
      className="w-full"
      action="/search"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        const query = normalizeQuery(value);
        if (query.length === 0) {
          return;
        }
        void navigate({
          to: "/search",
          search: { q: query },
        });
      }}
    >
      <Field>
        {label ? <FieldLabel htmlFor="search-global">{label}</FieldLabel> : null}
        <div className="flex flex-row gap-2">
          <InputGroup className="h-7.5! flex-1">
            <InputGroupInput
              ref={inputRef}
              id="search-global"
              required
              type="text"
              name="q"
              aria-label={label ? undefined : "Search query"}
              value={value}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onChange={(event) => setDraft({ base: initialQuery, value: event.target.value })}
            />
            {trailingAddon}
          </InputGroup>
          <Button type="submit">and chill</Button>
        </div>
      </Field>
    </form>
  );
}
