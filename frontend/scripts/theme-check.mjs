import fs from 'node:fs';

const hexToRgb = (hex) => {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const channel = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const palette = {
  ink: '#c8102e',
  charcoal: '#a81228',
  ember: '#c8102e',
  flame: '#e8890c',
  marigold: '#b8860b',
  secondary: '#b8860b',
  secondarySoft: '#fdf7e8',
  cream: '#ffffff',
  mist: '#ffffff',
  tint: '#ffffff',
  tintEdge: '#f2e6c9',
  muted: '#8d3a4a',
};

const pairs = [
  ['red heading text on page', palette.ink, palette.cream, 4.5],
  ['red heading text on card', palette.ink, palette.cream, 4.5],
  ['red text on light rose band', palette.ink, palette.mist, 4.5],
  ['muted body copy on page', palette.muted, palette.cream, 4.5],
  ['muted body copy on rose band', palette.muted, palette.mist, 4.5],
  ['red price on card', palette.ember, palette.cream, 4.5],
  ['red badge text on tint', palette.ember, palette.tint, 4.5],
  ['white on red primary button', '#ffffff', palette.ember, 4.5],
  ['white on deep red hover', '#ffffff', palette.charcoal, 4.5],
  ['red on white outlined button', palette.ember, palette.cream, 4.5],
  ['white on gold accent circle', '#ffffff', palette.marigold, 3],
  ['red text on white product mark', palette.ink, palette.cream, 4.5],
  ['stone-500 muted on card', '#78716c', palette.cream, 4.5],
  ['stone-600 muted on page', '#57534e', palette.cream, 4.5],
  ['stone-600 muted on tint', '#57534e', palette.tint, 4.5],
  ['stone-700 body on rose band', '#44403c', palette.mist, 4.5],
  ['navbar link on white header', palette.muted, palette.cream, 4.5],
  ['navbar active/hover on white header', palette.ink, palette.cream, 4.5],
  ['badge red text on soft gold', palette.ember, palette.secondarySoft, 4.5],
  ['muted body on soft gold callout', '#57534e', palette.secondarySoft, 4.5],
  ['stone-600 muted on soft gold', '#57534e', palette.secondarySoft, 4.5],
  ['stone-700 body on soft gold', '#44403c', palette.secondarySoft, 4.5],
  ['red icon on soft gold tile', palette.ember, palette.secondarySoft, 4.5],
  ['white heading on red highlight card', '#ffffff', palette.ember, 4.5],
  ['white/90 body on red highlight card', '#fae7ea', palette.ember, 4.5],
  ['white/90 body on deep red hover', '#f6dfe2', palette.charcoal, 4.5],
  ['white icon on translucent red tile', '#ffffff', palette.ember, 4.5],
];

let failures = 0;
for (const [name, fg, bg, min] of pairs) {
  const ratio = contrast(fg, bg);
  const pass = ratio >= min;
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${ratio.toFixed(2)}:1  (min ${min})  ${name}  [${fg} on ${bg}]`);
}

// Guard against the old palette sneaking back in
const css = fs.readFileSync('src/index.css', 'utf8');
const config = fs.readFileSync('tailwind.config.js', 'utf8');
const legacy = ['#10100f', '#2a0a0f', '#4a1119', '#e8782d', '#f7c45c', '#d4af37', '#fff7e8', '#fffaf0', 'rgba(232, 120, 45', 'rgba(16, 16, 15', 'rgba(42, 10, 15'];
for (const value of legacy) {
  if (css.includes(value) || config.includes(value)) {
    failures += 1;
    console.log(`FAIL  legacy value still present: ${value}`);
  }
}

console.log(failures ? `\n${failures} problem(s)` : '\nTheme contrast verified.');
process.exit(failures ? 1 : 0);
