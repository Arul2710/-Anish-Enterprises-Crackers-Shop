import { useEffect } from 'react';

/**
 * Page-level SEO.
 *
 * The site is a single-page app, so the <head> is static HTML and search engines only
 * see whatever index.html shipped with. These two hooks set the per-page title and meta
 * description as each route mounts, which is what gives About, Combo & Gift and the
 * Sivakasi page their own distinct snippet instead of all sharing one description.
 *
 * index.html keeps its own title and description for crawlers that never run the app,
 * and each managed element is created only if the document does not already have one.
 */
const SITE_NAME = 'Anish Enterprises';
const FALLBACK_TITLE = `${SITE_NAME} | Festive fireworks, thoughtfully curated`;

function upsertMeta(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    for (const [key, value] of Object.entries(attrs)) {
      element.setAttribute(key, value);
    }
    document.head.appendChild(element);
  }
  return element;
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
  return element;
}

/**
 * @param {string} title    Page name shown before the business name, e.g. "About us".
 * @param {string} description One sentence, roughly 140-160 characters.
 */
export function useSeo({ title, description, path } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : FALLBACK_TITLE;
    document.title = fullTitle;

    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
      upsertMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', fullTitle);
      upsertMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
      upsertMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
      upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', SITE_NAME);
    }

    if (path) {
      upsertLink('canonical', path).setAttribute('href', path);
      upsertMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', path);
    }

    return () => {
      document.title = FALLBACK_TITLE;
    };
  }, [title, description, path]);
}
