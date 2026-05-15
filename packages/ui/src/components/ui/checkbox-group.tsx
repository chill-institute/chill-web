import { Checkbox } from "./checkbox";

type Props = {
  onChange: (value: string[]) => void;
  options: {
    id: string;
    label: string;
  }[];
  uncheckedItems: string[];
};

export function CheckboxGroup({ onChange, options, uncheckedItems }: Props) {
  const handleOnChange = (id: string) => {
    const next = uncheckedItems.includes(id)
      ? uncheckedItems.filter((item) => item !== id)
      : [...uncheckedItems, id];

    onChange(next);
  };

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {options.map((option) => (
        <Checkbox
          checked={!uncheckedItems.includes(option.id)}
          id={option.id}
          key={option.id}
          label={option.label}
          onCheckedChange={() => {
            handleOnChange(option.id);
          }}
        />
      ))}
    </div>
  );
}
