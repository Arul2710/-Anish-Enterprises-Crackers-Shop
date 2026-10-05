import fs from 'node:fs';
import path from 'node:path';

// Every former "on dark" idiom -> its light-surface equivalent.
// Order matters: longer / more specific keys must be replaced first.
const replacements = [
  // hover variants before their bare counterparts
  ['hover:bg-white/10', 'hover:bg-tint'],
  ['hover:bg-white/15', 'hover:bg-tint'],
  // translucent white panels -> solid white cards on the light rose band
  ['bg-white/[0.06]', 'bg-white'],
  ['bg-white/[0.07]', 'bg-white'],
  ['bg-white/[0.08]', 'bg-white'],
  ['bg-white/10', 'bg-white'],
  ['border-white/20', 'border-tintEdge'],
  ['border-white/15', 'border-tintEdge'],
  ['border-white/10', 'border-tintEdge'],
  // black scrims on former dark bands
  ['bg-black/20', 'bg-mist'],
  ['bg-black/10', 'bg-mist'],
  // white text at reduced opacity -> red text at matched opacity
  ['text-white/75', 'text-ink/75'],
  ['text-white/70', 'text-ink/75'],
  ['text-white/60', 'text-ink/70'],
  ['text-white/55', 'text-ink/70'],
  ['text-white/50', 'text-ink/60'],
  ['text-white/45', 'text-ink/55'],
  ['text-white/40', 'text-ink/50'],
  ['text-white/35', 'text-ink/45'],
  ['text-white/30', 'text-ink/40'],
  // gold fails contrast on white -> use the red accent for text
  ['text-marigold', 'text-ember'],
  // former dark page-header bands -> light rose band
  ['bg-ink py-16 text-white sm:py-24', 'border-b border-tintEdge bg-mist py-16 sm:py-24'],
  ['bg-ink py-16 text-white sm:py-20', 'border-b border-tintEdge bg-mist py-16 sm:py-20'],
  ['bg-ink py-20 text-white sm:py-28', 'border-y border-tintEdge bg-mist py-20 sm:py-28'],
  ['bg-ink py-16 text-white', 'border-b border-tintEdge bg-mist py-16'],
];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(jsx)$/.test(entry.name) ? [full] : [];
  });

const counts = new Map();
let touched = 0;

for (const file of walk('src')) {
  const original = fs.readFileSync(file, 'utf8');
  let text = original;
  for (const [from, to] of replacements) {
    if (!text.includes(from)) continue;
    const n = text.split(from).length - 1;
    text = text.split(from).join(to);
    counts.set(from, (counts.get(from) || 0) + n);
  }
  if (text !== original) {
    fs.writeFileSync(file, text, 'utf8');
    touched += 1;
  }
}

for (const [from, n] of counts) console.log(`${String(n).padStart(3)}x  ${from}`);
console.log(`\n${touched} files updated`);
