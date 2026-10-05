import fs from 'node:fs';
import path from 'node:path';

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(js|jsx|css|html)$/.test(entry.name) ? [full] : [];
  });

const files = [...walk('src'), 'index.html', 'tailwind.config.js'];
const issues = [];
let nonAscii = 0;

for (const file of files) {
  const buffer = fs.readFileSync(file);
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) issues.push(`BOM: ${file}`);
  const text = buffer.toString('utf8');
  if (text.includes('\uFFFD')) issues.push(`REPLACEMENT CHAR: ${file}`);
  for (const ch of text) if (ch.codePointAt(0) > 127) { nonAscii += 1; break; }
}

console.log(issues.length ? issues.join('\n') : `Encoding clean across ${files.length} files (${nonAscii} contain intentional non-ASCII)`);
