import { Link } from 'react-router-dom';

export function Breadcrumbs({ items = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-stone-400">
      <Link className="transition hover:text-goldInk" to="/">Home</Link>
      {items.map((item, index) => (
        <span className="flex items-center gap-2" key={`${item.label}-${index}`}>
          <span className="text-stone-300">/</span>
          {item.to ? <Link className="transition hover:text-goldInk" to={item.to}>{item.label}</Link> : <span className="text-stone-600">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}
