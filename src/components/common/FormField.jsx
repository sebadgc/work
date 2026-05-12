import './FormField.css';

/**
 * Campo de formulario reutilizable.
 * Soporta text, number, select.
 */
export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  min,
  options, // para select: [{ value, label }]
  hint,
}) {
  const id = `field-${label?.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="form-field">
      {label && (
        <label className="form-field__label" htmlFor={id}>
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
      )}

      {options ? (
        <select
          id={id}
          className="form-field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="form-field__input"
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
        />
      )}

      {hint && <span className="form-field__hint">{hint}</span>}
    </div>
  );
}
