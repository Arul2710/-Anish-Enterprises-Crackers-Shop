import { ArrowLeft, ArrowRight, Info, LockKeyhole, Send, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ProductArtwork } from '../components/ProductArtwork';
import { submitEnquiry } from '../services/enquiries';
import { useContent } from '../hooks/useContent';
import { useEnquiry } from '../hooks/useEnquiry';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatCurrency } from '../utils/format';

const initialForm = {
  name: '',
  mobile: '',
  email: '',
  address: '',
  pin: '',
  city: '',
  occasion: '',
  preferredContact: 'Phone call',
  notes: '',
};

const preferredContactOptions = ['Phone call', 'WhatsApp message', 'Email reply', 'Any is fine'];

export function EnquiryFormPage() {
  useDocumentTitle('Send your enquiry');
  const navigate = useNavigate();
  const { items, itemCount, indicativeTotal, clearItems } = useEnquiry();
  const { siteContent } = useContent();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!items.length) return <Navigate to="/cart" replace />;

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const enquiry = await submitEnquiry({ ...form, items, indicativeTotal, itemCount });
      clearItems();
      navigate('/enquiry/success', { state: { enquiry } });
    } catch (submitError) {
      setError(submitError.message || 'We could not prepare your enquiry. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-cream">
      <section className="border-b border-stone-200 bg-white">
        <div className="container-shell py-10 sm:py-14">
          <Link to="/cart" className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-stone-400 transition hover:text-goldInk"><ArrowLeft size={14} /> Back to cart</Link>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Last step</span>
              <h1 className="mt-4 font-display text-5xl leading-none tracking-[-0.05em] text-ink sm:text-6xl">Send your <span className="text-goldInk">enquiry.</span></h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-marigold/30 bg-secondarySoft px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-goldInk"><LockKeyhole size={13} /> No payment taken</div>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          <div className="rounded-2xl border border-marigold/25 bg-secondarySoft p-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-goldInk" size={18} />
              <p className="text-xs leading-5 text-stone-600">This enquiry is prepared in your browser. In this phase nothing is sent to a server and no order or payment is created â€” the flow is ready to connect to a real enquiry endpoint.</p>
            </div>
          </div>

          <FormSection number="01" title="Your details" copy="We only use these to reply to your enquiry.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" value={form.name} onChange={updateField('name')} placeholder="Your name" required autoComplete="name" />
              <Field label="Mobile number" value={form.mobile} onChange={updateField('mobile')} placeholder="+91 00000 00000" type="tel" required autoComplete="tel" />
              <Field label="Email address" value={form.email} onChange={updateField('email')} placeholder="you@example.com" type="email" required autoComplete="email" />
              <Field label="City / town" value={form.city} onChange={updateField('city')} placeholder="Sivakasi" required autoComplete="address-level2" />
              <label className="sm:col-span-2">
                <span className="field-label">Delivery address</span>
                <textarea className="field-input min-h-28 resize-y" value={form.address} onChange={updateField('address')} placeholder="House / street / area / state" required autoComplete="street-address" />
              </label>
              <Field label="PIN code" value={form.pin} onChange={updateField('pin')} placeholder="6-digit PIN" required inputMode="numeric" autoComplete="postal-code" />
              <label>
                <span className="field-label">Occasion</span>
                <input className="field-input" value={form.occasion} onChange={updateField('occasion')} placeholder="Diwali, New Year, event..." />
              </label>
            </div>
          </FormSection>

          <FormSection number="02" title="How should we reach you?" copy="Pick whatever is easiest for you.">
            <div className="grid gap-3 sm:grid-cols-2">
              {preferredContactOptions.map((option) => (
                <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${form.preferredContact === option ? 'border-ember border-2 bg-secondarySoft' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                  <input className="sr-only" type="radio" name="preferredContact" value={option} checked={form.preferredContact === option} onChange={updateField('preferredContact')} />
                  <span className={`h-2 w-2 shrink-0 rounded-full ${form.preferredContact === option ? 'bg-ember' : 'bg-stone-300'}`} />
                  <span className="text-xs font-bold text-ink">{option}</span>
                </label>
              ))}
            </div>
            <label className="mt-5 block">
              <span className="field-label">Anything else we should know?</span>
              <textarea className="field-input min-h-28 resize-y" value={form.notes} onChange={updateField('notes')} placeholder="Delivery timing, preferred pack size, budget guidance..." />
            </label>
          </FormSection>

          {error && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</p>}

          <button className="btn-primary w-full sm:w-auto" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Preparing enquiry...' : 'Submit enquiry'} <Send size={15} />
          </button>
        </form>

        <EnquirySummary items={items} itemCount={itemCount} indicativeTotal={indicativeTotal} contact={siteContent.contact} />
      </section>
    </div>
  );
}

function FormSection({ number, title, copy, children }) {
  return (
    <section className="card-surface rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-[0.62rem] font-bold tracking-[0.15em] text-goldInk">{number}</span>
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        {copy && <p className="w-full text-xs text-stone-400">{copy}</p>}
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false, ...rest }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input className="field-input" type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} {...rest} />
    </label>
  );
}

function EnquirySummary({ items, itemCount, indicativeTotal, contact }) {
  const hasPhone = Boolean(String(contact?.phone || '').trim());
  return (
    <aside className="h-fit rounded-2xl bg-ember p-6 text-charcoal lg:sticky lg:top-32">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-charcoal">Your selection</p>
      <div className="mt-6 max-h-[19rem] space-y-4 overflow-y-auto pr-1">
        {items.map((item) => (
          <div className="flex gap-3" key={item.id}>
            <ProductArtwork product={item} className="h-14 min-h-0 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-charcoal">{item.name}</p>
              <p className="mt-1 text-[0.65rem] text-charcoal/75">Qty {item.quantity} Â· {item.packSize}</p>
            </div>
            <p className="text-xs font-bold text-charcoal">{formatCurrency(item.customerPrice * item.quantity)}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-white/25 pt-5">
        <div className="flex items-end justify-between">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-charcoal/85">{itemCount} listings</span>
          <span className="text-2xl font-bold text-charcoal">{formatCurrency(indicativeTotal)}</span>
        </div>
        <p className="mt-2 text-[0.62rem] leading-5 text-charcoal/75">NET RAT based. Delivery, final price and availability are confirmed in the reply.</p>
      </div>
      <div className="mt-6 flex gap-3 rounded-xl bg-white p-4 text-[0.65rem] leading-5 text-ink/70">
        <Info className="mt-0.5 shrink-0 text-goldInk" size={15} />
        <span>{hasPhone ? `We usually reply on ${contact.phone}.` : 'Add your preferred contact method so we can reply to you.'}</span>
      </div>
      <Link className="mt-5 inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-charcoal transition hover:text-ink" to="/faq">Read common questions <ArrowRight size={13} /></Link>
    </aside>
  );
}
