/**
 * Static check: every named import in src/ must resolve to a real export in the
 * target module. Catches the class of bug where code is written against an
 * assumed API that does not exist yet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith('.js') ? [full] : [];
  });

/** Collects `export const/function/class NAME` and `export { a, b }` names. */
const collectExports = (source) => {
  const names = new Set();
  const decl = /export\s+(?:const|let|var|async\s+function|function|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(decl)) names.add(match[1]);

  const list = /export\s*\{([^}]*)\}/g;
  for (const match of source.matchAll(list)) {
    for (const part of match[1].split(',')) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const asMatch = /\bas\s+([A-Za-z_$][\w$]*)/.exec(cleaned);
      names.add(asMatch ? asMatch[1] : cleaned.split(/\s+/)[0]);
    }
  }

  if (/export\s+default\b/.test(source)) names.add('default');
  // Re-exported modules: export * from './x.js'
  const star = /export\s+\*\s+from\s+['"](\.[^'"]+)['"]/g;
  for (const match of source.matchAll(star)) {
    const target = path.resolve(path.dirname(currentFile), match[1]);
    if (fs.existsSync(target)) {
      for (const name of collectExports(fs.readFileSync(target, 'utf8'))) names.add(name);
    }
  }
  return names;
};

const IMPORT_RE = /import\s+(?:([\w$]+)\s*,\s*)?(?:\{([^}]*)\}|\*\s+as\s+([\w$]+)|([\w$]+))?\s*(?:from\s*)?['"](\.[^'"]+)['"]/g;

const problems = [];
let checked = 0;

for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  for (const match of source.matchAll(IMPORT_RE)) {
    const [, , named, , , specifier] = match;
    if (!named || !specifier) continue;
    const target = path.resolve(path.dirname(file), specifier);
    if (!fs.existsSync(target)) {
      problems.push(`${rel}: cannot resolve "${specifier}"`);
      continue;
    }
    const available = collectExports(fs.readFileSync(target, 'utf8'));
    for (const part of named.split(',')) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const name = cleaned.split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      checked += 1;
      if (!available.has(name)) {
        problems.push(`${rel}: "${name}" is not exported by ${specifier}`);
      }
    }
  }
}

console.log(`checked ${checked} named imports`);
if (problems.length) {
  console.log(`\n${problems.length} unresolved import(s):`);
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exit(1);
}
console.log('all named imports resolve');
