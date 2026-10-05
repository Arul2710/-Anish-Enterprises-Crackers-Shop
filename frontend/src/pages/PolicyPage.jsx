import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { policyPages } from '../data/faq';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const relatedLinks = {
  privacy: [
    { label: 'Terms of use', to: '/terms' },
    { label: 'Safety guidance', to: '/safety' },
    { label: 'FAQ', to: '/faq' },
  ],
  terms: [
    { label: 'Privacy', to: '/privacy' },
    { label: 'Safety guidance', to: '/safety' },
    { label: 'FAQ', to: '/faq' },
  ],
  safety: [
    { label: 'FAQ', to: '/faq' },
    { label: 'Terms of use', to: '/terms' },
    { label: 'Contact us', to: '/contact' },
  ],
};

export function PolicyPage({ page }) {
  const content = policyPages[page];
  useDocumentTitle(content.title);

  return (
    <div className="bg-cream">
      <section className="border-b border-stone-200 bg-white">
        <div className="container-shell py-14 sm:py-20">
          <span className="eyebrow">{content.eyebrow}</span>
          <h1 className="display-title mt-5 max-w-3xl">{content.title}</h1>
          <p className="body-copy mt-5 max-w-2xl">{content.intro}</p>
          <p className="mt-6 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-400">{content.updated}</p>
        </div>
      </section>

      <section className="container-shell grid gap-10 py-10 sm:py-16 lg:grid-cols-[1fr_18rem] lg:gap-16">
        <div>
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: content.title }]} />
          <div className="mt-8 space-y-6">
            {content.sections.map((section) => (
              <section className="card-surface rounded-2xl p-5 sm:p-7" key={section.heading}>
                <h2 className="font-display text-2xl tracking-[-0.035em] text-ink">{section.heading}</h2>
                <p className="mt-3 text-sm leading-7 text-stone-500">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 lg:sticky lg:top-32">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-stone-400">Related pages</p>
          <div className="mt-4 grid gap-2">
            {relatedLinks[page].map((link) => (
              <Link className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 px-3 py-2.5 text-xs font-bold text-stone-600 transition hover:border-ember/40 hover:text-goldInk" to={link.to} key={link.to}>
                {link.label} <ArrowRight size={13} />
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
