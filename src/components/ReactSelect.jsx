import { useMemo } from "react";
import Select from "react-select";

export default function ReactSelect({
  label,
  options = [],
  value = "",
  onChange,
  placeholder = "Select",
  isDisabled = false,
  isMulti = false,
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

  const selected = isMulti
    ? sortedOptions.filter((option) =>
        (Array.isArray(value) ? value : []).map(String).includes(String(option.value))
      )
    : sortedOptions.find((option) => String(option.value) === String(value ?? "") && String(option.value) !== "") || null;

  return (
    <div className="react-select-field">
      {label && <label>{label}</label>}
      <Select
        classNamePrefix="react-select"
        options={sortedOptions}
        value={selected}
        onChange={(next) => {
          if (isMulti) onChange?.((next || []).map((option) => option.value));
          else onChange?.(next?.value ?? "");
        }}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isMulti={isMulti}
        isSearchable
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuPosition="fixed"
        isClearable={!isMulti}
        closeMenuOnSelect={!isMulti}
        styles={{
          menu: (base) => ({ ...base, zIndex: 10000 }),
          menuPortal: (base) => ({ ...base, zIndex: 10000 }),
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
