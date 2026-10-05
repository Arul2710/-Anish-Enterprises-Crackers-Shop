import { AlertTriangle, Check, Info, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AdminPageHeader({ eyebrow, title, description, action }) {
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow">{eyebrow}</span><h1 className="mt-3 font-display text-4xl leading-none tracking-[-0.05em] text-ink sm:text-5xl">{title}</h1>{description && <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>;
}

export function AdminStatCard({ label, value, note, icon: Icon, tone = 'orange', to }) {
  const tones = { orange: 'bg-secondarySoft text-goldInk', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-sky-50 text-sky-600', violet: 'bg-violet-50 text-violet-600', red: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600' };
  const body = <div className="admin-card h-full rounded-2xl p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-400">{label}</p><p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-ink">{value}</p></div>{Icon && <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tones[tone] || tones.orange}`}><Icon size={18} strokeWidth={1.7} /></span>}</div>{note && <p className="mt-3 text-xs text-stone-400">{note}</p>}</div>;
  if (!to) return body;
  return <a className="block transition hover:-translate-y-0.5" href={to}>{body}</a>;
}

export function PreviewNotice({ children, tone = 'orange' }) {
  const styles = tone === 'blue' ? 'border-sky-100 bg-sky-50 text-sky-800' : 'border-tintEdge bg-secondarySoft text-stone-600';
  return <div className={`flex gap-3 rounded-2xl border p-4 text-xs leading-5 ${styles}`}><Info className="mt-0.5 shrink-0 text-current" size={17} /><div>{children}</div></div>;
}

export function StatusPill({ children, tone = 'orange' }) {
  const styles = { orange: 'bg-secondarySoft text-goldInk', green: 'bg-emerald-50 text-emerald-700', blue: 'bg-sky-50 text-sky-700', red: 'bg-rose-50 text-rose-700', slate: 'bg-stone-100 text-stone-600', amber: 'bg-amber-50 text-amber-700', royal: 'bg-indigo-50 text-indigo-700' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${styles[tone] || styles.orange}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

export function Modal({ title, description, onClose, children, wide = false }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`my-auto max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-2xl sm:rounded-3xl sm:p-7 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}><div className="flex items-start justify-between gap-5"><div><h2 className="font-display text-3xl leading-none tracking-[-0.04em] text-ink">{title}</h2>{description && <p className="mt-2 text-xs leading-5 text-stone-500">{description}</p>}</div><button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-stone-400 transition hover:bg-ink hover:text-white" aria-label="Close dialog"><X size={16} /></button></div><div className="mt-7">{children}</div></div></div>;
}

export function EmptyAdminState({ icon: Icon, title, copy, children }) {
  return <div className="admin-card rounded-2xl px-6 py-14 text-center"><Icon className="mx-auto text-stone-300" size={30} strokeWidth={1.4} /><h3 className="mt-4 font-display text-2xl text-ink">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">{copy}</p>{children}</div>;
}

export function ValidationMessage({ children }) {
  if (!children) return null;
  return <p className="flex items-center gap-2 text-xs text-rose-600"><AlertTriangle size={14} />{children}</p>;
}

export function SuccessMessage({ children }) {
  if (!children) return null;
  return <p className="flex items-center gap-2 text-xs text-emerald-600"><Check size={14} />{children}</p>;
}

/* ------------------------------------------------------------------ feedback */

/** One error / one confirmation per page, cleared as soon as the operator acts. */
export function useAdminFeedback() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const notify = (message) => {
    setError('');
    setSuccess(message);
  };
  const fail = (err) => {
    setSuccess('');
    setError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
  };
  const clear = () => {
    setError('');
    setSuccess('');
  };
  return { error, success, notify, fail, clear };
}

export function AdminFeedback({ error, success }) {
  if (!error && !success) return null;
  return <div className="space-y-2">{error && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"><AlertTriangle size={14} />{error}</p>}{success && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700"><Check size={14} />{success}</p>}</div>;
}

export function ConfirmDialog({ title, description, confirmLabel = 'Confirm', tone = 'ember', busy = false, onConfirm, onClose, children }) {
  return <Modal title={title} description={description} onClose={onClose}><div className="space-y-5">{children}<div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-full border border-stone-200 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink">Cancel</button><button type="button" disabled={busy} onClick={onConfirm} className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${tone === 'red' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-ember hover:bg-emberDark'}`}>{busy ? 'Working...' : confirmLabel}</button></div></div></Modal>;
}

/* --------------------------------------------------------------------- forms */

const controlClass = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15 disabled:bg-stone-50 disabled:text-stone-400';

export function AdminField({ label, hint, error, required, className = '', children }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-stone-500">{label}{required && <span className="ml-1 text-goldInk">*</span>}</span>{children}{hint && !error && <span className="mt-1.5 block text-[0.65rem] leading-4 text-stone-400">{hint}</span>}{error && <span className="mt-1.5 block text-[0.65rem] leading-4 text-rose-600">{error}</span>}</label>;
}

export function AdminInput({ className = '', ...props }) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function AdminTextarea({ className = '', rows = 3, ...props }) {
  return <textarea rows={rows} className={`${controlClass} resize-y ${className}`} {...props} />;
}

export function AdminSelect({ options = [], className = '', children, ...props }) {
  return <select className={`${controlClass} appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%235a7a5a'%3E%3Cpath d='M5.5 7.5 10 12l4.5-4.5'/%3E%3C/svg%3E')] bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${className}`} {...props}>{children || options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

export function AdminToggle({ checked, onChange, label, description, disabled = false }) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left transition hover:border-stone-300 disabled:opacity-60"><span><span className="block text-sm font-bold text-ink">{label}</span>{description && <span className="mt-0.5 block text-[0.68rem] leading-4 text-stone-500">{description}</span>}</span><span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-ember' : 'bg-stone-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.4rem]' : 'left-0.5'}`} /></span></button>;
}

export function AdminSearch({ value, onChange, placeholder = 'Search', className = '' }) {
  return <div className={`relative ${className}`}><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${controlClass} pl-10`} /></div>;
}

export function AdminFormGrid({ children, columns = 2 }) {
  return <div className={`grid gap-4 ${columns === 3 ? 'sm:grid-cols-3' : columns === 1 ? '' : 'sm:grid-cols-2'}`}>{children}</div>;
}

export function AdminFormActions({ children }) {
  return <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-tintEdge pt-5 sm:flex-row sm:justify-end">{children}</div>;
}

export const AdminPrimaryButton = ({ className = '', ...props }) => <button type="button" className={`rounded-full bg-ember px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emberDark disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />;

export const AdminGhostButton = ({ className = '', ...props }) => <button type="button" className={`rounded-full border border-stone-200 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />;

export const AdminDangerButton = ({ className = '', ...props }) => <button type="button" className={`rounded-full bg-rose-600 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />;

export const AdminTinyButton = ({ className = '', tone = 'stone', ...props }) => {
  const tones = { stone: 'border-stone-200 text-stone-600 hover:border-ink hover:text-ink', ember: 'border-ember/30 text-goldInk hover:bg-secondarySoft', red: 'border-rose-200 text-rose-600 hover:bg-rose-50', green: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' };
  return <button type="button" className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone] || tones.stone} ${className}`} {...props} />;
};

/* ------------------------------------------------------------------ sections */

export function AdminSectionCard({ title, description, action, children, className = '' }) {
  return <section className={`admin-card rounded-2xl p-5 sm:p-6 ${className}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-display text-2xl leading-tight tracking-[-0.03em] text-ink">{title}</h2>{description && <p className="mt-1.5 max-w-xl text-xs leading-5 text-stone-500">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div><div className="mt-5">{children}</div></section>;
}

export function AdminTabs({ tabs = [], value, onChange, className = '' }) {
  return <div className={`hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 ${className}`} role="tablist">{tabs.map((tab) => {
    const active = tab.value === value;
    return <button key={tab.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(tab.value)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.08em] transition ${active ? 'border-ember bg-ember text-white' : 'border-stone-200 bg-white text-stone-500 hover:border-ink hover:text-ink'}`}>{tab.label}{tab.count !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] ${active ? 'bg-white/20' : 'bg-stone-100 text-stone-500'}`}>{tab.count}</span>}</button>;
  })}</div>;
}

export function AdminProgressRing({ value, max = 4, label, tone = 'ember', size = 84 }) {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, Math.max(0, (Number(value) || 0) / safeMax));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tones = { ember: '#D4AF37', green: '#006400', blue: '#0284c7', red: '#e11d48' };
  return <div className="flex items-center gap-4"><div className="relative shrink-0" style={{ width: size, height: size }}><svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eae7dd" strokeWidth={stroke} /><circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tones[tone] || tones.ember} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} /></svg><span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">{label}</span></div></div>;
}

export function AdminProgressSteps({ steps = [], current = 0, tone = 'ember' }) {
  const tones = { ember: 'bg-ember', green: 'bg-emerald-600', blue: 'bg-sky-600', red: 'bg-rose-600' };
  return <ol className="flex flex-wrap items-center gap-2">{steps.map((step, index) => {
    const done = index < current;
    const active = index === current;
    return <li key={step} className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] ${active ? `${tones[tone] || tones.ember} text-white` : done ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>{done && <Check size={12} />}{step}</span>{index < steps.length - 1 && <span className={`h-px w-4 ${done ? 'bg-emerald-300' : 'bg-stone-200'}`} />}</li>;
  })}</ol>;
}

export function AdminTableNote({ children }) {
  return <p className="mt-3 text-[0.68rem] text-stone-400">{children}</p>;
}

export function AdminDataList({ items = [] }) {
  if (!items.length) return <p className="py-6 text-center text-xs text-stone-400">Nothing recorded yet.</p>;
  return <ul className="divide-y divide-line">{items.map((item) => <li key={item.label} className="flex items-center justify-between gap-4 py-2.5"><span className="text-xs text-stone-500">{item.label}</span><span className="text-right text-sm font-bold text-ink">{item.value}</span></li>)}</ul>;
}

export function AdminBarList({ items = [], formatValue = (value) => value }) {
  const max = items.reduce((peak, item) => Math.max(peak, Number(item.value) || 0), 0) || 1;
  if (!items.length) return <p className="py-6 text-center text-xs text-stone-400">No data in this range.</p>;
  return <ul className="space-y-3">{items.map((item) => <li key={item.label}><div className="flex items-baseline justify-between gap-3 text-xs"><span className="truncate font-semibold text-ink">{item.label}</span><span className="shrink-0 text-stone-500">{formatValue(item.value)}{item.note ? <span className="ml-2 text-stone-400">{item.note}</span> : null}</span></div><div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-ember" style={{ width: `${Math.max(2, ((Number(item.value) || 0) / max) * 100)}%` }} /></div></li>)}</ul>;
}

export function AdminSparkline({ points = [], tone = '#D4AF37' }) {
  const values = points.map((point) => Number(point) || 0);
  if (values.length < 2) return null;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pointsAttr = values.map((value, index) => `${(index / (values.length - 1)) * 100},${34 - ((value - min) / span) * 30}`).join(' ');
  return <svg className="h-10 w-full" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><polyline points={pointsAttr} fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
