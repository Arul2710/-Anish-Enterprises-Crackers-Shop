import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The app source uses extensionless relative imports because Vite resolves them.
// Node needs the extension, so this hook fills it in for the smoke tests.
const extensions = ['.js', '.jsx', '/index.js'];

export function resolve(specifier, context, next) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  if (isRelative && !/\.(js|jsx|mjs|json|css)$/.test(specifier)) {
    for (const extension of extensions) {
      const candidate = new URL(specifier + extension, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return next(specifier + extension, context);
    }
  }
  return next(specifier, context);
}
