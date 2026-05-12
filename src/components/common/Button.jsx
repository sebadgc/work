import './Button.css';

/**
 * Botón reutilizable con variantes.
 * @param {'default'|'primary'|'danger'|'ghost'} variant
 * @param {'sm'|'md'} size
 */
export default function Button({
  children,
  variant = 'default',
  size = 'sm',
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
