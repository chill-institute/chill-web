const DEFAULT_VISIBLE_TAIL = 16;

function splitMiddle(text: string, visibleTail = DEFAULT_VISIBLE_TAIL) {
  if (text.length <= visibleTail + 1) {
    return { head: text, tail: "" };
  }

  const splitAt = Math.max(1, text.length - visibleTail);
  return {
    head: text.slice(0, splitAt),
    tail: text.slice(splitAt),
  };
}

function MiddleTruncatedText({
  className,
  text,
  visibleTail,
}: {
  className?: string;
  text: string;
  visibleTail?: number;
}) {
  const { head, tail } = splitMiddle(text, visibleTail);

  if (!tail) {
    return <span className={className}>{head}</span>;
  }

  return (
    <span className={className}>
      <span className="min-w-0 truncate">{head}</span>
      <span className="shrink-0">{tail}</span>
    </span>
  );
}

export { MiddleTruncatedText };
