import { Caption } from "@/app/_components/ui/Typography";

import OptionButton from "./OptionButton";

type Choice<T extends string> = { label: string; value: T };

type ChoiceGroupProps<T extends string> = {
  choices: readonly Choice<T>[];
  label: string;
  onSelect: (value: T) => void;
  selected: T;
};

const ChoiceGroup = <T extends string>({ choices, label, onSelect, selected }: ChoiceGroupProps<T>) => (
  <div>
    <Caption className="text-body-strong mb-3">{label}</Caption>
    <div className="flex flex-wrap gap-2">
      {choices.map(({ label: choiceLabel, value }) => (
        <OptionButton
          key={value}
          label={choiceLabel}
          onClick={() => onSelect(value)}
          selected={selected === value}
        />
      ))}
    </div>
  </div>
);

export default ChoiceGroup;
