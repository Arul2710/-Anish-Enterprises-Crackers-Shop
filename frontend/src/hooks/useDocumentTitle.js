import { useEffect } from 'react';

const siteName = 'Anish Enterprises';
const fallbackTitle = `${siteName} | Festive fireworks, thoughtfully curated`;

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${siteName}` : fallbackTitle;
    return () => {
      document.title = fallbackTitle;
    };
  }, [title]);
}
