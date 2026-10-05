import { ArrowUpRight, ChevronDown, Clock3, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { defaultFaqs } from '../data/faq';
import { contactLines, contactPhoneLines } from '../data/siteContent';
import { useContent } from '../hooks/useContent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const CONTACT_FAQ_IDS = ['faq-enquiry-vs-order', 'faq-price', 'faq-availability', 'faq-payment', 'faq-safety'];
const CONTACT_FAQS = CONTACT_FAQ_IDS.map((id) => defaultFaqs.find((faq) => faq.id === id)).filter(Boolean);

export function ContactPage() {
  useDocumentTitle('Contact');
  const { siteContent } = useContent();
  const contact = siteContent.contact;
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const location = contactLines(contact);
  // The shop answers on two lines. Both are listed, in the order the shop asked for, and
  // each opens the dialler rather than the page it happens to sit on.
  const phoneLines = contactPhoneLines(contact);
  const hasPhone = phoneLines.length > 0;
  const hasEmail = Boolean(String(contact.email || '').trim());
  const hasMap = Boolean(String(contact.mapUrl || '').trim());
  const hasMapEmbed = Boolean(String(contact.mapEmbedUrl || '').trim());

  const submit = (event) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className="bg-cream">
      <section className="relative isolate overflow-hidden border-b border-tintEdge bg-navy py-16 sm:py-24">
        <img src="/bg/hero4.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/80 via-charcoal/40 to-charcoal/25 lg:bg-gradient-to-r lg:from-charcoal/80 lg:via-charcoal/40 lg:to-charcoal/5" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-charcoal/60 to-transparent" />
        <div className="container-shell relative text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-white/15 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">Come say hello</span>
          <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">Let&apos;s make your next <span className="text-goldBright">spark</span> easy.</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-base">Questions about a category, a pack unit or how to choose? Send a note and our team will help you find the right direction.</p>
        </div>
      </section>

      <section className="container-shell grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <div>
          <span className="eyebrow">Reach out</span>
          <h2 className="section-title mt-4">A real person, a helpful answer.</h2>
          <div className="mt-9 grid gap-5">
            {phoneLines.map((line) => <ContactItem key={line.value} icon={Phone} title={line.label} value={line.value} href={`tel:${line.value}`} />)}
            {hasEmail && <ContactItem icon={Mail} title="Send an email" value={contact.email} href={`mailto:${contact.email}`} />}
            {location && <ContactItem icon={MapPin} title="Visit us" value={location} href={hasMap ? contact.mapUrl : undefined} external={hasMap} />}
            {contact.businessHours && <ContactItem icon={Clock3} title="Availability desk" value={contact.businessHours} />}
            {!hasPhone && !hasEmail && !location && !contact.businessHours && !hasMap && (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-5">
                <p className="text-sm font-bold text-ink">Contact details are being published</p>
                <p className="mt-2 text-sm leading-6 text-stone-500">We are not showing unverified contact details. In the meantime, build an enquiry list and we will reply to it directly.</p>
                <Link className="btn-primary mt-5" to="/products">Browse the catalog <ArrowUpRight size={15} /></Link>
              </div>
            )}
          </div>
          <div className="mt-10 flex gap-3 rounded-2xl border border-marigold/25 bg-secondarySoft p-4 text-xs leading-5 text-stone-600">
            <ShieldCheck className="mt-0.5 shrink-0 text-goldInk" size={17} />
            <span>For safety, please check local guidelines and supervise children around fireworks. <Link className="font-bold text-goldInk underline" to="/safety">Read the safety page</Link></span>
          </div>
        </div>

        <div className="card-surface rounded-3xl p-6 sm:p-9">
          {sent ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><MessageCircle size={28} /></div>
              <h2 className="mt-6 font-display text-4xl text-ink">Message received.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-stone-500">This is a frontend-only preview, so no message was sent. The form is ready to connect to a future support endpoint.</p>
              <button className="btn-secondary mt-7" type="button" onClick={() => setSent(false)}>Send another note</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <span className="eyebrow">Send a message</span>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.04em] text-ink">What can we help with?</h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <label><span className="field-label">Name</span><input className="field-input" required placeholder="Your name" /></label>
                <label><span className="field-label">Mobile number</span><input className="field-input" required type="tel" placeholder="+91 00000 00000" /></label>
                <label className="sm:col-span-2"><span className="field-label">Email address</span><input className="field-input" required type="email" placeholder="you@example.com" /></label>
                <label className="sm:col-span-2"><span className="field-label">How can we help?</span><textarea className="field-input min-h-32 resize-y" required placeholder="Tell us what you are looking for..." /></label>
              </div>
              <button className="btn-primary mt-7" type="submit">Send message <ArrowUpRight size={15} /></button>
              <p className="mt-4 text-[0.65rem] leading-5 text-stone-400">Frontend preview only · no data is sent anywhere.</p>
            </form>
          )}
        </div>
      </section>

      {hasMapEmbed && (
        <section aria-labelledby="contact-map-title" className="border-t border-stone-200 bg-white py-16 sm:py-20">
          <div className="container-shell">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow">Find us</span>
                <h2 id="contact-map-title" className="section-title mt-4">Where to find the shop</h2>
                {location && <p className="mt-3 text-sm leading-6 text-stone-500">{location}</p>}
              </div>
              {hasMap && (
                <a className="btn-secondary self-start sm:self-auto" href={contact.mapUrl} target="_blank" rel="noreferrer">
                  Get directions <ArrowUpRight size={15} />
                </a>
              )}
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border border-tintEdge shadow-card">
              <iframe
                className="h-80 w-full sm:h-[26rem]"
                src={contact.mapEmbedUrl}
                title="Map showing the shop location"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-stone-200 bg-white py-16 sm:py-20">
        <div className="container-shell">
          <div className="max-w-2xl">
            <span className="eyebrow">Before you write</span>
            <h2 className="section-title mt-4">Questions we hear most.</h2>
          </div>

          <div className="mt-10 border-t border-stone-200">
            {CONTACT_FAQS.map((faq) => {
              const open = openFaq === faq.id;
              return (
                <div key={faq.id} className="border-b border-stone-200">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : faq.id)}
                    aria-expanded={open}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left transition hover:text-goldInk"
                  >
                    <span className="font-display text-lg leading-snug text-ink transition group-hover:text-goldInk sm:text-xl">{faq.question}</span>
                    <ChevronDown size={18} className={`shrink-0 text-goldInk transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] pb-5 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="max-w-3xl text-sm leading-7 text-stone-600">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-sm text-stone-500">
            Still unsure about something?{' '}
            <Link className="font-bold text-goldInk underline" to="/faq">Read the full FAQ</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * One row of the contact block. A row that can be acted on is a single link covering the
 * whole row rather than a link around a link: nesting anchors is invalid markup, and
 * browsers break it apart into two separate links, which would leave a phone number
 * listed twice on the page and give it a garbled label for screen readers.
 */
function ContactItem({ icon: Icon, title, value, href, external = false }) {
  const linkProps = external ? { target: '_blank', rel: 'noreferrer' } : {};
  const valueClass = 'mt-1 block text-sm font-bold text-ink';
  const body = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-marigold/30 bg-secondarySoft text-goldInk"><Icon size={17} strokeWidth={1.7} /></div>
      <div>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.13em] text-stone-400">{title}</p>
        <p className={`${valueClass} ${href ? 'transition group-hover:text-goldInk' : ''}`}>{value}</p>
      </div>
    </>
  );
  return href ? (
    <a className="group flex gap-4" href={href} {...linkProps}>{body}<ArrowUpRight className="mt-1 ml-auto text-stone-300 transition group-hover:text-goldInk" size={15} /></a>
  ) : (
    <div className="flex gap-4">{body}</div>
  );
}
