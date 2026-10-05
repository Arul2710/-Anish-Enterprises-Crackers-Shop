export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatCompactNumber = (value) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);

export const formatCategory = (category) =>
  category
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const getInitials = (value = '') =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export const getCategoryTone = (tone = 'gold') => {
  const tones = {
    gold: { background: 'bg-goldSurface', text: 'text-goldInk', dot: 'bg-goldDot' },
    amber: { background: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    rose: { background: 'bg-goldSurface', text: 'text-goldInk', dot: 'bg-goldDot' },
    violet: { background: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500' },
    blue: { background: 'bg-sky-100', text: 'text-sky-800', dot: 'bg-sky-500' },
    green: { background: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
    orange: { background: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
    pink: { background: 'bg-pink-100', text: 'text-pink-800', dot: 'bg-pink-500' },
    yellow: { background: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    cyan: { background: 'bg-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-500' },
    purple: { background: 'bg-fuchsia-100', text: 'text-fuchsia-800', dot: 'bg-fuchsia-500' },
    red: { background: 'bg-goldSurface', text: 'text-goldInk', dot: 'bg-goldDot' },
  };
  return tones[tone] || tones.gold;
};

export const slugify = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};
