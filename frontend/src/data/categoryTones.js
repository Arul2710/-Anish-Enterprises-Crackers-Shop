const TONE_CLASSES = {
  gold: ['bg-goldSurface', 'text-goldInk', 'border-goldLine', 'bg-goldDot', 'from-goldWash', 'to-goldSurface'],
  amber: ['bg-amber-50', 'text-amber-800', 'border-amber-200', 'bg-amber-500', 'from-amber-50', 'to-orange-50'],
  rose: ['bg-goldSurface', 'text-goldInk', 'border-goldLine', 'bg-goldDot', 'from-goldWash', 'to-goldSurface'],
  violet: ['bg-violet-50', 'text-violet-800', 'border-violet-200', 'bg-violet-500', 'from-violet-50', 'to-indigo-50'],
  blue: ['bg-sky-50', 'text-sky-800', 'border-sky-200', 'bg-sky-500', 'from-sky-50', 'to-blue-50'],
  green: ['bg-emerald-50', 'text-emerald-800', 'border-emerald-200', 'bg-emerald-500', 'from-emerald-50', 'to-lime-50'],
  orange: ['bg-orange-50', 'text-orange-800', 'border-orange-200', 'bg-orange-500', 'from-orange-50', 'to-amber-50'],
  pink: ['bg-pink-50', 'text-pink-800', 'border-pink-200', 'bg-pink-500', 'from-pink-50', 'to-goldSurface'],
  yellow: ['bg-yellow-50', 'text-yellow-800', 'border-yellow-200', 'bg-yellow-500', 'from-yellow-50', 'to-lime-50'],
  cyan: ['bg-cyan-50', 'text-cyan-800', 'border-cyan-200', 'bg-cyan-500', 'from-cyan-50', 'to-sky-50'],
  purple: ['bg-fuchsia-50', 'text-fuchsia-800', 'border-fuchsia-200', 'bg-fuchsia-500', 'from-fuchsia-50', 'to-purple-50'],
  red: ['bg-goldSurface', 'text-goldInk', 'border-goldLine', 'bg-goldDot', 'from-goldWash', 'to-goldSurface'],
  navy: ['bg-slate-100', 'text-slate-800', 'border-slate-200', 'bg-slate-500', 'from-slate-50', 'to-slate-100'],
};

const FALLBACK = TONE_CLASSES.gold;

export const getTone = (tone) => {
  const [surface, text, border, dot, from, to] = TONE_CLASSES[tone] || FALLBACK;
  return {
    surface,
    text,
    border,
    dot,
    wash: `bg-gradient-to-br ${from} ${to}`,
    chip: `${surface} ${text} ${border}`,
  };
};
