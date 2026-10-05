import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return <div className="container-shell flex min-h-[65vh] items-center justify-center py-20 text-center"><div><Sparkles className="mx-auto text-goldInk" size={32} /><p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-goldInk">404 · Lost in the sparkle</p><h1 className="mt-3 font-display text-6xl leading-none tracking-[-0.06em] text-ink">That page is missing.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-stone-500">Let&apos;s get you back to something that lights up the night.</p><Link className="btn-primary mt-8" to="/"><ArrowLeft size={15} /> Back home</Link></div></div>;
}
