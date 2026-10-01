import { useMemo, useState } from "react";

export default function ReactSelect({
  label,
  options = [],
  value = "",
  onChange,
  placeholder = "Select",
  isDisabled = false,
  isMulti = false,
}) {
  const [open, setOpen] = useState(false);

  const selectedValues = isMulti
    ? Array.isArray(value) ? value : []
    : value ? [value] : [];

  const selectedSet = useMemo(() => new Set(selectedValues.map(String)), [selectedValues]);

  const selectedOptions = options.filter((option) => selectedSet.has(String(option.value)));

  const selectValue = (optionValue) => {
    if (isDisabled) return;

    if (isMulti) {
      const id = String(optionValue);
      const next = selectedSet.has(id)
        ? selectedValues.filter((item) => String(item) !== id)
        : [...selectedValues, optionValue];
      onChange?.(next);
      return;
    }

    onChange?.(optionValue);
    setOpen(false);
  };

  const displayText = selectedOptions.length
    ? isMulti
      ? `${selectedOptions.length} selected`
      : selectedOptions[0]?.label
    : placeholder;

  return (
    <div className={`react-select-field ${isDisabled ? "is-disabled" : ""}`}>
      {label && <label>{label}</label>}

      <div className="react-select-control-wrap">
        <button
          type="button"
          className={`react-select-control ${open ? "is-open" : ""}`}
          onClick={() => !isDisabled && setOpen((current) => !current)}
          disabled={isDisabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={!selectedOptions.length ? "placeholder" : ""}>
            {displayText}
          </span>
          <span className="react-select-arrow">⌄</span>
        </button>

        {open && !isDisabled && (
          <>
            <div
              className="react-select-backdrop"
              onClick={() => setOpen(false)}
            />
            <div className="react-select-menu" role="listbox">
              {options.length === 0 ? (
                <div className="react-select-empty">No options available</div>
              ) : (
                options.map((option) => {
                  const selected = selectedSet.has(String(option.value));
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`react-select-option ${selected ? "selected" : ""}`}
                      onClick={() => selectValue(option.value)}
                    >
                      {isMulti && (
                        <span className={`react-select-checkbox ${selected ? "checked" : ""}`}>
                          {selected ? "✓" : ""}
                        </span>
                      )}
                      <span>{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
