import { MessageSquareQuote, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPublishedTestimonials } from '../data/testimonials';
import { useContent } from '../hooks/useContent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function ReviewsPage() {
  useDocumentTitle('Customer reviews');
  const { testimonials } = useContent();
  const published = getPublishedTestimonials(testimonials);

  return (
    <div className="bg-cream">
      <section className="border-b border-stone-200 bg-white">
        <div className="container-shell py-14 sm:py-20">
          <span className="eyebrow">What customers say</span>
          <h1 className="display-title mt-5 max-w-3xl">Real words, <span className="text-goldInk">only from real customers.</span></h1>
          <p className="body-copy mt-5 max-w-2xl">We publish reviews only after a customer has confirmed them with us. Nothing on this page is generated or invented.</p>
        </div>
      </section>

      <section className="container-shell py-12 sm:py-16">
        {published.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {published.map((testimonial) => (
              <article className="card-surface flex flex-col rounded-2xl p-5 sm:p-6" key={testimonial.id}>
                <div className="flex items-center gap-1 text-goldInk">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={14} className={index < Number(testimonial.rating) ? 'fill-goldDeep' : 'text-stone-200'} />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-sm leading-7 text-stone-600">{testimonial.message}</p>
                <div className="mt-5 border-t border-stone-100 pt-4">
                  <p className="text-sm font-bold text-ink">{testimonial.name}</p>
                  {testimonial.location && <p className="mt-1 text-xs text-stone-400">{testimonial.location}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card-surface rounded-2xl px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-marigold/30 bg-secondarySoft text-goldInk"><MessageSquareQuote size={26} strokeWidth={1.5} /></div>
            <h2 className="mt-6 font-display text-3xl tracking-[-0.04em] text-ink">No reviews published yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-500">We would rather show an honest empty page than fill it with sample testimonials. Reviews appear here once customers share them and our team verifies them.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="btn-primary" to="/products">Explore the catalog</Link>
              <Link className="btn-secondary" to="/contact">Share your experience</Link>
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-stone-400">
          <Sparkles size={14} className="text-goldInk" />
          Review content is managed from the admin testimonials area.
        </div>
      </section>
    </div>
  );
}
