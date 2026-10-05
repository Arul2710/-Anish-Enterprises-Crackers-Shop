import { ArrowUpRight, Facebook, Instagram, Mail, Map, MapPin, Phone, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { contactLines, contactPhoneLines, socialLinkFor, socialPlatforms } from '../data/siteContent';
import { useContent } from '../hooks/useContent';
import { BrandLogo } from './BrandLogo';

const socialIconMap = { instagram: Instagram, facebook: Facebook, youtube: Youtube };

/**
 * The three brand channels shown in this row, in the order the shop asked for them.
 * LinkedIn and WhatsApp are left out: this row is the three networks the brand runs a
 * public page on, and the shop's enquiry flow already runs through the enquiry form at
 * /enquiry/form, so the brand channels sit under the strapline on their own.
 */
const footerSocialKeys = ['instagram', 'facebook', 'youtube'];

export function Footer() {
  const { siteContent } = useContent();
  const { contact, social } = siteContent;
  // Every platform in the row is drawn whether or not the shop has published a handle
  // yet. A published handle opens that account; otherwise the icon opens the platform's
  // own site, so the footer never shows a dead button.
  const socialRows = footerSocialKeys
    .map((key) => {
      const platform = socialPlatforms.find((entry) => entry.key === key);
      if (!platform) return null;
      return { key, label: platform.label, href: socialLinkFor(key, social?.[key]) };
    })
    .filter(Boolean);
  const location = contactLines(contact);
  // Both published numbers appear here, the same one first as on the contact page, and
  // each opens the dialler.
  const phoneLines = contactPhoneLines(contact);
  const hasContact = Boolean(location || phoneLines.length || contact.email || contact.businessHours || contact.mapUrl);

  return (
    <footer className="border-t border-tintEdge bg-mist text-ink">
      <div className="container-shell grid gap-10 py-14 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:py-20">
        <div>
          <BrandLogo size="footer" />
          <p className="mt-6 max-w-sm text-sm leading-7 text-ink/60">A thoughtful edit of festive favourites for the moments that deserve a little more sparkle.</p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {socialRows.map(({ key, label, href }) => {
              const Icon = socialIconMap[key];
              if (!Icon || !href) return null;
              return (
                <a
                  key={key}
                  className="group flex h-10 w-10 items-center justify-center rounded-full border border-goldLine bg-goldWash text-goldInk transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-marigold hover:bg-marigold hover:text-onGold hover:shadow-card focus-visible:-translate-y-0.5 focus-visible:border-marigold focus-visible:bg-marigold focus-visible:text-onGold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-mist motion-reduce:transform-none motion-reduce:transition-none"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (opens in a new tab)`}
                >
                  <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-goldInk">Explore</p>
          <div className="mt-5 grid gap-3 text-sm text-ink/70">
            <Link className="transition hover:text-goldInk" to="/products">All products</Link>
            <Link className="transition hover:text-goldInk" to="/combo-packs">Combo &amp; Gift</Link>
            <Link className="transition hover:text-goldInk" to="/about">Our story</Link>
            <Link className="transition hover:text-goldInk" to="/reviews">Reviews</Link>
            <Link className="transition hover:text-goldInk" to="/faq">FAQ</Link>
            <Link className="transition hover:text-goldInk" to="/contact">Contact</Link>
          </div>
        </div>

        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-goldInk">Get in touch</p>
          {hasContact ? (
            <div className="mt-5 grid gap-4 text-sm text-ink/70">
              {location && <p className="flex gap-3 leading-6"><MapPin className="mt-0.5 shrink-0 text-goldInk" size={16} /> {location}</p>}
              {contact.mapUrl && <a className="flex gap-3 leading-6 transition hover:text-goldInk" href={contact.mapUrl} target="_blank" rel="noreferrer"><Map className="mt-0.5 shrink-0 text-goldInk" size={16} /> Find us on Google Maps</a>}
              {phoneLines.map((line) => (
                <a key={line.value} className="flex gap-3 leading-6 transition hover:text-goldInk" href={`tel:${line.value}`}>
                  <Phone className="mt-0.5 shrink-0 text-goldInk" size={16} />
                  <span>{line.value}</span>
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink/40">{line.label}</span>
                </a>
              ))}
              {contact.email && <a className="flex gap-3 leading-6 transition hover:text-goldInk" href={`mailto:${contact.email}`}><Mail className="mt-0.5 shrink-0 text-goldInk" size={16} /> {contact.email}</a>}
              {contact.businessHours && <p className="leading-6">{contact.businessHours}</p>}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-ink/50">Contact details are being published. Browse the catalog or send an enquiry list in the meantime.</p>
          )}
          <div className="mt-6 grid gap-2">
            <Link className="group inline-flex items-center gap-2 font-bold text-goldInk transition hover:text-charcoal" to="/cart">View your cart <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
            <Link className="group inline-flex items-center gap-2 text-ink/70 transition hover:text-goldInk" to="/admin/login">Admin preview <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          </div>
        </div>
      </div>

      <div className="border-t border-tintEdge">
        <div className="container-shell flex flex-col gap-3 py-5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Anish Enterprises. Enquiry-based catalog preview.</p>
          <div className="flex flex-wrap gap-4">
            <Link className="transition hover:text-goldInk" to="/privacy">Privacy</Link>
            <Link className="transition hover:text-goldInk" to="/terms">Terms</Link>
            <Link className="transition hover:text-goldInk" to="/safety">Safety</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
