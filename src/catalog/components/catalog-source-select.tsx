import { NativeSelect } from "@/ui/components/ui/native-select";

type CatalogSourceSelectProps<T extends number> = {
  label: string;
  name: string;
  value: T;
  sources: readonly T[];
  getLabel: (source: T) => string;
  parse: (value: string) => T | undefined;
  widthClassName: string;
  onChange: (value: T) => void;
};

export function CatalogSourceSelect<T extends number>({
  label,
  name,
  value,
  sources,
  getLabel,
  parse,
  widthClassName,
  onChange,
}: CatalogSourceSelectProps<T>) {
  return (
    <NativeSelect
      aria-label={label}
      name={name}
      value={String(value)}
      wrapperClassName={widthClassName}
      className="h-8 text-sm"
      onChange={(event) => {
        const parsed = parse(event.currentTarget.value);
        if (parsed === undefined) {
          return;
        }
        onChange(parsed);
      }}
    >
      {sources.map((source) => (
        <option key={source} value={String(source)}>
          {getLabel(source)}
        </option>
      ))}
    </NativeSelect>
  );
}
