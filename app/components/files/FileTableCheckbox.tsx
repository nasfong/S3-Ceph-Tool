type FileTableCheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title?: string;
};

export function FileTableCheckbox({
  checked,
  disabled,
  onChange,
  title,
}: FileTableCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      title={title}
      className="h-4 w-4 rounded border-white/8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
