import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function BrandMark({ compact = false, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <Link className="group inline-flex items-center gap-2.5" to="/" aria-label="Anish Enterprises, go to homepage">
      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 ${
          dark ? 'bg-white/10 text-white ring-1 ring-white/25' : 'bg-navy text-white'
        }`}
      >
        <Sparkles size={18} strokeWidth={1.7} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-white" />
      </span>
      <span className="leading-none">
        <span className={`block text-[1.15rem] font-extrabold tracking-[-0.035em] ${dark ? 'text-white' : 'text-navy'}`}>
          Anish <span className={dark ? 'text-goldBright' : 'text-goldInk'}>Enterprises</span>
        </span>
        {!compact && (
          <span className={`mt-1 block text-[0.5rem] font-bold uppercase tracking-[0.22em] ${dark ? 'text-white/60' : 'text-navyMute'}`}>
            Festive fireworks
          </span>
        )}
      </span>
    </Link>
  );
}
