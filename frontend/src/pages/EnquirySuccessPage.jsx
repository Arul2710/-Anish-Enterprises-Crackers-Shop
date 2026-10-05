import { ArrowRight, Check, Copy, Info } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatCurrency } from '../utils/format';

export function EnquirySuccessPage() {
  useDocumentTitle('Enquiry prepared');
  const location = useLocation();
  const enquiry = location.state?.enquiry || null;
  const [copied, setCopied] = useState(false);

  if (!enquiry) return <NoEnquiry />;

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(enquiry.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-cream">
      <section className="container-shell flex min-h-[72vh] items-center justify-center py-16 sm:py-24">
        <div className="w-full max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={34} /></div>
          <span className="eyebrow mt-8">Enquiry prepared</span>
          <h1 className="mt-4 font-display text-5xl leading-none tracking-[-0.05em] text-ink sm:text-6xl">Thank you{enquiry.name ? `, ${enquiry.name.split(' ')[0]}` : ''}.</h1>
          <p className="body-copy mx-auto mt-5 max-w-lg">Your enquiry is ready with {enquiry.items.length} {enquiry.items.length === 1 ? 'listing' : 'listings'}. Share the reference below with our team so we can pull up the same details.</p>

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-400">Enquiry reference</p>
                <p className="mt-1 font-display text-2xl tracking-tight text-ink">{enquiry.reference}</p>
              </div>
              <button type="button" onClick={copyReference} className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:border-ink hover:text-ink" aria-label="Copy enquiry reference">
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-sm">
              <p className="flex items-center justify-between text-stone-500"><span>Contact</span><span className="font-bold text-ink">{enquiry.mobile}</span></p>
              <p className="flex items-center justify-between text-stone-500"><span>Reply via</span><span className="font-bold text-ink">{enquiry.preferredContact}</span></p>
              <p className="flex items-center justify-between text-stone-500"><span>Indicative value</span><span className="font-bold text-ink">{formatCurrency(enquiry.indicativeTotal)}</span></p>
            </div>
          </div>

          <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-marigold/25 bg-secondarySoft p-4 text-left text-xs leading-5 text-stone-600">
            <Info className="mt-0.5 shrink-0 text-goldInk" size={16} />
            <span>This preview stores your enquiry in your own browser only. Nothing has been sent to a server, no order exists and no payment has been taken.</span>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn-primary" to="/products">Continue browsing <ArrowRight size={15} /></Link>
            <Link className="btn-secondary" to="/contact">Contact details</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function NoEnquiry() {
  return (
    <div className="container-shell flex min-h-[63vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-5xl tracking-[-0.05em] text-ink">No enquiry to show.</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-stone-500">Build a shortlist first, then send your enquiry and the confirmation will appear here.</p>
      <Link className="btn-primary mt-8" to="/products">Explore the catalog <ArrowRight size={15} /></Link>
    </div>
  );
}
