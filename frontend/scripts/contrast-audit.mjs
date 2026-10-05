import fs from 'node:fs';
import path from 'node:path';

const theme = {
  ink: '#c8102e',
  charcoal: '#a81228',
  ember: '#c8102e',
  flame: '#e8890c',
  marigold: '#b8860b',
  cream: '#ffffff',
  mist: '#fdf4f2',
  tint: '#fdeef0',
  tintEdge: '#f6d5da',
  white: '#ffffff',
  black: '#000000',
  'stone-50': '#fafaf9',
  'stone-100': '#f5f5f4',
  'stone-200': '#e7e5e4',
  'stone-300': '#d6d3d1',
  'stone-400': '#a8a29e',
  'stone-500': '#78716c',
  'stone-600': '#57534e',
  'stone-700': '#44403c',
  'rose-50': '#fff1f2',
  'rose-100': '#ffe4e6',
  'rose-600': '#e11d48',
  'emerald-100': '#d1fae5',
  'emerald-600': '#059669',
  'emerald-800': '#065f46',
  'sky-100': '#e0f2fe',
};

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const blend = (fg, bg, alpha) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

const resolve = (name, alpha, over) => {
  const hex = theme[name];
  if (!hex) return null;
  const rgb = hexToRgb(hex);
  return alpha < 1 ? blend(rgb, over || [255, 255, 255], alpha) : rgb;
};

const tokenPattern = (prefix) =>
  new RegExp(`(?<![\\w-])${prefix}-([a-z]+(?:-[0-9]{2,3})?)(?:/([0-9]{1,3}))?(?![\\w-])`, 'g');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.jsx$/.test(entry.name) ? [full] : [];
  });

const problems = [];
let pairsChecked = 0;

for (const file of walk('src')) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    // Only reason about a single element's own className
    const classNames = [...line.matchAll(/className="([^"]*)"|className=\{`([^`]*)`\}/g)]
      .map((m) => m[1] ?? m[2])
      .join(' ');
    if (!classNames) return;

    // Drop state-prefixed utilities: a hover/group-hover background only exists
    // in that state, and the text colour flips with it, so pairing them against
    // the resting state produces false failures.
    const resting = classNames
      .replace(/\b(?:hover|focus|active|group-hover|focus-within|disabled):[\w[\]#./%-]+/g, ' ')
      // Conditional className branches cannot be resolved statically
      .replace(/\$\{[^}]*\}/g, ' ');

    const bgs = [...resting.matchAll(tokenPattern('bg'))].map((m) => ({
      name: m[1],
      alpha: m[2] ? Number(m[2]) / 100 : 1,
    }));
    const texts = [...resting.matchAll(tokenPattern('text'))].map((m) => ({
      name: m[1],
      alpha: m[2] ? Number(m[2]) / 100 : 1,
      raw: m[0],
    }));
    if (!bgs.length || !texts.length) return;

    // Assume the most common surface in the app: white
    for (const bg of bgs) {
      const bgRgb = resolve(bg.name, bg.alpha, [255, 255, 255]);
      if (!bgRgb) continue;
      for (const fg of texts) {
        const fgRgb = resolve(fg.name, fg.alpha, bgRgb);
        if (!fgRgb) continue;
        pairsChecked += 1;
        const ratio = contrast(fgRgb, bgRgb);
        if (ratio < 3) {
          problems.push({
            file,
            line: index + 1,
            detail: `${fg.raw} on bg-${bg.name}${bg.alpha < 1 ? `/${Math.round(bg.alpha * 100)}` : ''} = ${ratio.toFixed(2)}:1`,
          });
        }
      }
    }
  });
}

console.log(`${pairsChecked} text/background pairs evaluated across src\n`);
if (!problems.length) {
  console.log('PASS  no low-contrast text/background pairs found');
} else {
  for (const p of problems) console.log(`FAIL  ${p.file}:${p.line}  ${p.detail}`);
  console.log(`\n${problems.length} low-contrast pair(s)`);
}
