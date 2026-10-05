import { FileText, HelpCircle, LayoutTemplate, Save, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useContent } from '../hooks/useContent';
import { AdminPageHeader, AdminStatCard, PreviewNotice } from './AdminUI';

export function AdminContentPage() {
  const { siteContent, updateAnnouncement, updateServiceHighlights, faqs, setFaqs } = useContent();
  const [saved, setSaved] = useState(false);

  const save = () => setSaved(true);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Website content"
        title="Content"
        description="Edit the announcement bar, homepage hero copy, service highlights and FAQ answers that appear on the storefront."
        action={<button className="btn-primary" type="button" onClick={save}><Save size={15} /> Save content</button>}
      />

      <PreviewNotice>Content is stored in this browser. When a backend is connected these fields move to a database-backed content service.</PreviewNotice>

      {saved && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">Content saved to this browser and reflected on the storefront.</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Announcement" value={siteContent.announcement.enabled ? 'On' : 'Off'} note={siteContent.announcement.text ? 'Text configured' : 'No text set'} icon={LayoutTemplate} />
        <AdminStatCard label="Service highlights" value={siteContent.serviceHighlights.length} note="Shown under the hero" icon={Sparkles} tone="blue" />
        <AdminStatCard label="FAQ entries" value={faqs.length} note="Published answers" icon={HelpCircle} tone="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card rounded-2xl p-5 sm:p-7">
          <h2 className="font-display text-2xl text-ink">Announcement bar</h2>
          <p className="mt-2 text-xs text-stone-400">The dark strip at the very top of every page.</p>
          <div className="mt-6 grid gap-4">
            <label>
              <span className="field-label">Announcement text</span>
              <input className="field-input" value={siteContent.announcement.text} onChange={(event) => { updateAnnouncement({ text: event.target.value }); setSaved(false); }} />
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4 accent-ember" checked={siteContent.announcement.enabled} onChange={(event) => { updateAnnouncement({ enabled: event.target.checked }); setSaved(false); }} />
              <span className="text-xs font-bold text-ink">Show the announcement bar</span>
            </label>
          </div>
        </section>

        <section className="admin-card rounded-2xl p-5 sm:p-7">
          <h2 className="font-display text-2xl text-ink">Service highlights</h2>
          <p className="mt-2 text-xs text-stone-400">The four cards shown directly under the homepage banner. Each key is fixed and decides the icon.</p>
        <div className="mt-6 grid gap-4">
          {siteContent.serviceHighlights.map((highlight, index) => (
            <div className="grid gap-4 rounded-xl border border-stone-100 p-4 sm:grid-cols-[0.9fr_1.4fr_0.6fr]" key={highlight.id}>
              <label>
                <span className="field-label">Title</span>
                <input
                  className="field-input"
                  value={highlight.title}
                  onChange={(event) => {
                    const next = [...siteContent.serviceHighlights];
                    next[index] = { ...highlight, title: event.target.value };
                    updateServiceHighlights(next);
                    setSaved(false);
                  }}
                />
              </label>
              <label>
                <span className="field-label">Description</span>
                <input
                  className="field-input"
                  value={highlight.copy}
                  onChange={(event) => {
                    const next = [...siteContent.serviceHighlights];
                    next[index] = { ...highlight, copy: event.target.value };
                    updateServiceHighlights(next);
                    setSaved(false);
                  }}
                />
              </label>
              <label>
                <span className="field-label">Icon key</span>
                <input className="field-input" value={highlight.id} readOnly title="Icon keys are fixed" />
              </label>
            </div>
          ))}
        </div>
      </section>
      </div>

      <section className="admin-card rounded-2xl p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600"><FileText size={18} /></span>
          <div>
            <h2 className="font-display text-2xl text-ink">FAQ entries</h2>
            <p className="mt-1 text-xs text-stone-400">Answers published on the FAQ page.</p>
          </div>
        </div>
        <div className="mt-7 grid gap-4">
          {faqs.map((faq, index) => (
            <div className="rounded-xl border border-stone-100 p-4" key={faq.id}>
              <input
                className="field-input"
                value={faq.question}
                onChange={(event) => {
                  const next = [...faqs];
                  next[index] = { ...faq, question: event.target.value };
                  setFaqs(next);
                  setSaved(false);
                }}
              />
              <textarea
                className="field-input mt-3 min-h-24 resize-y"
                value={faq.answer}
                onChange={(event) => {
                  const next = [...faqs];
                  next[index] = { ...faq, answer: event.target.value };
                  setFaqs(next);
                  setSaved(false);
                }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
