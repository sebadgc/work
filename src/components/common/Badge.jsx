import './Badge.css';

/**
 * Badge/chip pequeño para labels de estado.
 * @param {'accent'|'blue'|'green'|'red'|'yellow'|'neutral'} color
 */
export default function Badge({ children, color = 'neutral' }) {
  return <span className={`badge badge--${color}`}>{children}</span>;
}
