import { Children, useMemo } from "react";
import Select from "react-select";

const getOptionLabel = (node) => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getOptionLabel).join("");
  if (node.props?.children !== undefined) return getOptionLabel(node.props.children);
  return "";
};

/**
 * Drop-in replacement for native <select> controls.
 * Keeps the existing event.target.value contract while adding react-select
 * searching and alphabetically sorted options.
 */
export default function SearchableSelect({
  children,
  value = "",
  onChange,
  multiple = false,
  disabled = false,
  required = false,
  className = "",
  name,
  ...props
}) {
  const options = useMemo(() => {
    const items = Children.toArray(children)
      .filter((child) => child && child.type === "option")
      .map((child) => ({
        value: child.props.value ?? child.props.children ?? "",
        label: getOptionLabel(child.props.children),
        isDisabled: Boolean(child.props.disabled),
      }));

    const placeholder = items.filter((item) => String(item.value) === "");
    const actual = items
      .filter((item) => String(item.value) !== "")
      .sort((a, b) => a.label.localeCompare(b.label, undefined, {
        sensitivity: "base",
        numeric: true,
      }));

    return [...placeholder, ...actual];
  }, [children]);

  const selected = multiple
    ? options.filter((option) =>
        (Array.isArray(value) ? value : [])
          .map(String)
          .includes(String(option.value))
      )
    : options.find((option) => String(option.value) === String(value ?? "") && String(option.value) !== "") || null;

  const handleChange = (next) => {
    if (multiple) {
      const nextValues = (next || []).map((item) => item.value);
      onChange?.({ target: { name, value: nextValues } });
    } else {
      onChange?.({ target: { name, value: next?.value ?? "" } });
    }
  };

  return (
    <div className={`searchable-select ${className}`}>
      <Select
        classNamePrefix="react-select"
        options={options}
        value={selected}
        onChange={handleChange}
        isMulti={multiple}
        isDisabled={disabled}
        isSearchable
        isClearable={!required && !multiple}
        placeholder={options.find((item) => String(item.value) === "")?.label || "Select..."}
        name={name}
        {...props}
      />
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          required
          value={multiple ? (selected.length ? "selected" : "") : (selected?.value ?? "")}
          onChange={() => {}}
          style={{
            position: "absolute",
            opacity: 0,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
