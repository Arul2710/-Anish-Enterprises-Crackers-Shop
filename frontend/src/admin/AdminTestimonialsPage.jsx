import { MessageSquareQuote, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { averageRating, testimonialStatus } from '../data/testimonials';
import { useContent } from '../hooks/useContent';
import { AdminPageHeader, AdminStatCard, EmptyAdminState, PreviewNotice, StatusPill, ValidationMessage } from './AdminUI';

const initialDraft = { name: '', location: '', rating: 5, message: '', status: testimonialStatus.pending };

const statusTone = { pending: 'orange', published: 'green', hidden: 'slate' };

export function AdminTestimonialsPage() {
  const { testimonials, addTestimonial, updateTestimonial, removeTestimonial } = useContent();
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState('');

  const published = testimonials.filter((item) => item.status === testimonialStatus.published);
  const average = averageRating(testimonials);

  const save = (event) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.message.trim()) {
      setError('A customer name and review message are required.');
      return;
    }
    setError('');
    addTestimonial({ ...draft, createdAt: new Date().toISOString() });
    setDraft(initialDraft);
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Review management"
        title="Testimonials"
        description="Add only reviews that real customers have shared. Publishing is manual so nothing unverified reaches the storefront."
        action={<Link className="btn-secondary" to="/reviews"><MessageSquareQuote size={15} /> View reviews page</Link>}
      />

      <PreviewNotice>No sample reviews are preloaded. The storefront shows an honest empty state until you publish real customer feedback here.</PreviewNotice>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Total reviews" value={testimonials.length} note="Stored in this browser" icon={MessageSquareQuote} />
        <AdminStatCard label="Published" value={published.length} note="Visible on the storefront" icon={Star} tone="green" />
        <AdminStatCard label="Average rating" value={average ? average.toFixed(1) : '—'} note={average ? 'From rated reviews' : 'No ratings yet'} icon={Star} tone="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          {testimonials.length === 0 ? (
            <EmptyAdminState icon={MessageSquareQuote} title="No testimonials yet" copy="Use the form to add the first verified customer review. Reviews stay unpublished until you switch them to published." />
          ) : (
            testimonials.map((testimonial) => (
              <article className="admin-card rounded-2xl p-5" key={testimonial.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{testimonial.name}</p>
                    <p className="mt-1 text-xs text-stone-400">{testimonial.location || 'Location not provided'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-goldInk">
                    {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={13} className={index < Number(testimonial.rating) ? 'fill-goldDeep' : 'text-stone-200'} />)}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-stone-600">{testimonial.message}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                  {Object.values(testimonialStatus).map((status) => (
                    <button key={status} type="button" onClick={() => updateTestimonial(testimonial.id, { status })} className={`rounded-full px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition ${testimonial.status === status ? 'bg-ember text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{status}</button>
                  ))}
                  <span className="ml-auto"><StatusPill tone={statusTone[testimonial.status]}>{testimonial.status}</StatusPill></span>
                  <button type="button" onClick={() => removeTestimonial(testimonial.id)} className="text-stone-300 transition hover:text-rose-500" aria-label={`Delete review by ${testimonial.name}`}><Trash2 size={15} /></button>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="admin-card h-fit rounded-2xl p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-marigold/30 bg-secondarySoft text-goldInk"><Plus size={18} /></span>
            <div>
              <h2 className="font-display text-2xl text-ink">Add a review</h2>
              <p className="mt-1 text-xs text-stone-400">Only add feedback a customer has actually given you.</p>
            </div>
          </div>
          <form className="mt-7 grid gap-4" onSubmit={save}>
            <label><span className="field-label">Customer name</span><input className="field-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Customer name" /></label>
            <label><span className="field-label">Location</span><input className="field-input" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Town or city" /></label>
            <label>
              <span className="field-label">Rating</span>
              <select className="field-input" value={draft.rating} onChange={(event) => setDraft((current) => ({ ...current, rating: Number(event.target.value) }))}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>)}
              </select>
            </label>
            <label><span className="field-label">Review</span><textarea className="field-input min-h-32 resize-y" value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} placeholder="What the customer said..." /></label>
            <label>
              <span className="field-label">Status</span>
              <select className="field-input" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                {Object.values(testimonialStatus).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            {error && <ValidationMessage>{error}</ValidationMessage>}
            <button className="btn-primary" type="submit">Add review</button>
          </form>
        </section>
      </div>
    </div>
  );
}
