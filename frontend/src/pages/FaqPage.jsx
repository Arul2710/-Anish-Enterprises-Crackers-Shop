import { HelpCircle, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useContent } from '../hooks/useContent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function FaqPage() {
  useDocumentTitle('Frequently asked questions');
  const { faqs, siteContent } = useContent();
  const contact = siteContent.contact;
  const hasPhone = Boolean(String(contact.phone || '').trim());

  return (
    <div className="bg-cream">
      <section className="border-b border-stone-200 bg-white">
        <div className="container-shell py-14 sm:py-20">
          <span className="eyebrow">Before you ask</span>
          <h1 className="display-title mt-5 max-w-3xl">Questions, <span className="text-goldInk">answered clearly.</span></h1>
          <p className="body-copy mt-5 max-w-2xl">How the enquiry flow works, why prices are indicative, and what happens after you send your list.</p>
        </div>
      </section>

      <section className="container-shell py-10 sm:py-16">
        <div className="mb-8"><Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'FAQ' }]} /></div>
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details className="card-surface group rounded-2xl p-5 sm:p-6" key={faq.id}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-bold text-ink marker:hidden">
                  <span>{faq.question}</span>
                  <HelpCircle className="mt-0.5 shrink-0 text-goldInk" size={17} />
                </summary>
                <p className="mt-4 text-sm leading-7 text-stone-500">{faq.answer}</p>
              </details>
            ))}
            {!faqs.length && <p className="text-sm text-stone-500">No questions have been published yet. Send us your question and we will add it here.</p>}
          </div>

          <aside className="h-fit rounded-2xl bg-ember p-6 text-charcoal lg:sticky lg:top-32">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-charcoal">Still unsure?</p>
            <p className="mt-4 text-sm leading-6 text-charcoal/85">Tell us what you are looking for and we will point you to the right listing.</p>
            <div className="mt-6 grid gap-3">
              <Link className="flex items-center gap-3 rounded-xl bg-white p-3 text-xs font-bold text-goldInk transition hover:bg-secondarySoft" to="/contact">
                <MessageCircle size={16} className="text-goldInk" /> Send a message
              </Link>
              {hasPhone && (
                <a className="flex items-center gap-3 rounded-xl bg-white p-3 text-xs font-bold text-goldInk transition hover:bg-secondarySoft" href={`tel:${contact.phone}`}>
                  <Phone size={16} className="text-goldInk" /> {contact.phone}
                </a>
              )}
              <Link className="flex items-center gap-3 rounded-xl bg-white p-3 text-xs font-bold text-goldInk transition hover:bg-secondarySoft" to="/safety">
                <HelpCircle size={16} className="text-goldInk" /> Read safety guidance
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
