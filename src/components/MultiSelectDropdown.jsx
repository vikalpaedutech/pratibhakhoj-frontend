export default function MultiSelectDropdown({ label, options, value, onChange, placeholder = "Select" }) {
  const selected = new Set(value || []);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <div className="multi-select-field">
      <span className="multi-select-label">{label}</span>
      <details className="multi-select">
        <summary>
          {selected.size ? `${selected.size} selected` : placeholder}
          <span>⌄</span>
        </summary>
        <div className="multi-select-menu">
          {options.length === 0 ? (
            <div className="multi-select-empty">No options available</div>
          ) : options.map((option) => (
            <label key={option.value} className="multi-select-option">
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
