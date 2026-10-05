import { LayoutGrid, Rows3 } from 'lucide-react';

/**
 * List / Grid switch for the catalog.
 *
 * Both options are always rendered and always clickable - only the fill changes, so
 * the control never appears to lose an icon. The active option is filled navy with a
 * white icon and a ring; the inactive one keeps a solid navy icon on a bordered
 * surface. Order is List then Grid to match how the options are named.
 */
const OPTIONS = [
  { value: 'list', label: 'List view', Icon: Rows3 },
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
];

export function ViewToggle({ value, onChange, className = '' }) {
  return (
    <div
      className={`flex shrink-0 items-center gap-1 rounded-xl border border-line bg-white p-1 ${className}`}
      role="group"
      aria-label="Change catalog layout"
    >
      {OPTIONS.map(({ value: option, label, Icon }) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            data-active={active ? 'true' : 'false'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:ring-offset-1 ${
              active
                ? 'border-navy bg-navy text-white shadow-sm'
                : 'border-transparent bg-transparent text-navy hover:border-line hover:bg-panel'
            }`}
          >
            <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
