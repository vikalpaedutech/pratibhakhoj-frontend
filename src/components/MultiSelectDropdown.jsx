import { useMemo } from "react";
import Select from "react-select";

export default function MultiSelectDropdown({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = "Select",
}) {
  const sortedOptions = useMemo(
    () => [...options].sort((a, b) =>
      String(a.label ?? "").localeCompare(String(b.label ?? ""), undefined, {
        sensitivity: "base",
        numeric: true,
      })
    ),
    [options]
  );
  const selected = sortedOptions.filter((option) =>
    (Array.isArray(value) ? value : []).map(String).includes(String(option.value))
  );

  return (
    <div className="multi-select-field">
      {label && <span className="multi-select-label">{label}</span>}
      <Select
        classNamePrefix="react-select"
        options={sortedOptions}
        value={selected}
        onChange={(next) => onChange((next || []).map((option) => option.value))}
        placeholder={placeholder}
        isMulti
        isSearchable
        closeMenuOnSelect={false}
        styles={{
          menu: (base) => ({ ...base, zIndex: 1000 }),
          control: (base, state) => ({
            ...base,
            minHeight: 42,
            borderColor: state.isFocused ? "#27356f" : "#cbd5e1",
            boxShadow: state.isFocused ? "0 0 0 1px #27356f" : "none",
            "&:hover": { borderColor: "#64748b" },
          }),
        }}
      />
    </div>
  );
}
