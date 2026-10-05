export const testimonialStorageKey = 'spark-shine-testimonials';

export const testimonialStatus = {
  pending: 'pending',
  published: 'published',
  hidden: 'hidden',
};

export const defaultTestimonials = [];

export const normalizeTestimonials = (value) => {
  if (!Array.isArray(value)) return defaultTestimonials;
  return value.filter((item) => item && typeof item === 'object' && String(item.name || '').trim());
};

export const getPublishedTestimonials = (value) =>
  normalizeTestimonials(value).filter((item) => item.status === testimonialStatus.published);

export const averageRating = (testimonials) => {
  const rated = testimonials.filter((item) => Number(item.rating) > 0);
  if (!rated.length) return 0;
  return rated.reduce((total, item) => total + Number(item.rating), 0) / rated.length;
};
