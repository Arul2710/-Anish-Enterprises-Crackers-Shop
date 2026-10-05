import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultFaqs, faqStorageKey } from '../data/faq';
import { mergeSiteContent, siteContentDefaults, siteContentStorageKey } from '../data/siteContent';
import { defaultTestimonials, normalizeTestimonials, testimonialStorageKey } from '../data/testimonials';
import { readStorage, writeStorage } from '../utils/storage';
import { ContentContext } from './ContentContextValue';

export function ContentProvider({ children }) {
  const [siteContent, setSiteContent] = useState(() => mergeSiteContent(readStorage(siteContentStorageKey, null)));
  const [testimonials, setTestimonials] = useState(() => normalizeTestimonials(readStorage(testimonialStorageKey, defaultTestimonials)));
  const [faqs, setFaqs] = useState(() => {
    const stored = readStorage(faqStorageKey, null);
    return Array.isArray(stored) && stored.length ? stored : defaultFaqs;
  });

  useEffect(() => {
    writeStorage(siteContentStorageKey, siteContent);
  }, [siteContent]);

  useEffect(() => {
    writeStorage(testimonialStorageKey, testimonials);
  }, [testimonials]);

  useEffect(() => {
    writeStorage(faqStorageKey, faqs);
  }, [faqs]);

  // Keeps this tab in step with edits made in another tab.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = (event) => {
      if (event.key === siteContentStorageKey) setSiteContent(mergeSiteContent(readStorage(siteContentStorageKey, null)));
      if (event.key === testimonialStorageKey) setTestimonials(normalizeTestimonials(readStorage(testimonialStorageKey, defaultTestimonials)));
      if (event.key === faqStorageKey) {
        const storedFaqs = readStorage(faqStorageKey, null);
        setFaqs(Array.isArray(storedFaqs) ? storedFaqs : defaultFaqs);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const updateContact = useCallback((patch) => {
    setSiteContent((current) => ({ ...current, contact: { ...current.contact, ...patch } }));
  }, []);

  const updateSocial = useCallback((patch) => {
    setSiteContent((current) => ({ ...current, social: { ...current.social, ...patch } }));
  }, []);

  const updateAnnouncement = useCallback((patch) => {
    setSiteContent((current) => ({ ...current, announcement: { ...current.announcement, ...patch } }));
  }, []);

  const updateHero = useCallback((patch) => {
    setSiteContent((current) => ({ ...current, hero: { ...current.hero, ...patch } }));
  }, []);

  const updateServiceHighlights = useCallback((highlights) => {
    setSiteContent((current) => ({
      ...current,
      serviceHighlights: Array.isArray(highlights) && highlights.length ? highlights : siteContentDefaults.serviceHighlights,
    }));
  }, []);

  const addTestimonial = useCallback((testimonial) => {
    setTestimonials((current) => [
      ...current,
      { ...testimonial, id: testimonial.id || `testimonial-${Date.now()}` },
    ]);
  }, []);

  const updateTestimonial = useCallback((id, patch) => {
    setTestimonials((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeTestimonial = useCallback((id) => {
    setTestimonials((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      siteContent,
      updateContact,
      updateSocial,
      updateAnnouncement,
      updateHero,
      updateServiceHighlights,
      testimonials,
      addTestimonial,
      updateTestimonial,
      removeTestimonial,
      faqs,
      setFaqs,
    }),
    [
      siteContent,
      updateContact,
      updateSocial,
      updateAnnouncement,
      updateHero,
      updateServiceHighlights,
      testimonials,
      addTestimonial,
      updateTestimonial,
      removeTestimonial,
      faqs,
    ],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
