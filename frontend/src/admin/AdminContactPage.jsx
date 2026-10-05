import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import {
  AdminDataList,
  AdminFeedback,
  AdminField,
  AdminFormActions,
  AdminGhostButton,
  AdminInput,
  AdminPageHeader,
  AdminPrimaryButton,
  AdminSectionCard,
  AdminTextarea,
  AdminTinyButton,
  PreviewNotice,
  useAdminFeedback,
} from './AdminUI';

export function AdminContactPage() {
  const { siteContent, updateContact, updateSocial } = useContent();
  const feedback = useAdminFeedback();
  const contact = siteContent.contact || {};
  const social = siteContent.social || {};
  const [draft, setDraft] = useState({ ...contact });
  const [socialDraft, setSocialDraft] = useState({ ...social });

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const setSocialField = (field, value) => setSocialDraft((current) => ({ ...current, [field]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(contact) || JSON.stringify(socialDraft) !== JSON.stringify(social);

  const save = () => {
    // Both published lines are checked the same way. A typo here puts a dead number on
    // the contact page and in the footer, and neither is obvious until someone calls it.
    for (const [label, value] of [['phone number', draft.phone], ['second phone number', draft.phoneAlt]]) {
      if (value && !/^[\d\s+()-]{6,}$/.test(value)) {
        feedback.fail(`Enter the ${label} with digits only, or check it for typos.`);
        return;
      }
    }
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      feedback.fail('Enter a valid email address.');
      return;
    }
    if (socialDraft.whatsapp && !/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(socialDraft.whatsapp.trim())) {
      feedback.fail('The WhatsApp link should start with https://wa.me/');
      return;
    }
    updateContact(draft);
    updateSocial(socialDraft);
    feedback.notify('Contact details saved. The storefront now shows these values.');
  };

  const completeness = [
    ['Business name', contact.businessName],
    ['Phone', contact.phone],
    ['Second phone', contact.phoneAlt],
    ['Email', contact.email],
    ['Address', contact.address],
    ['City', contact.city],
    ['Business hours', contact.businessHours],
    ['WhatsApp link', social.whatsapp],
  ];
  const filled = completeness.filter(([, value]) => String(value || '').trim()).length;

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Storefront"
        title="Contact details"
        description="These details appear on the contact page, in the footer, on printed order sheets and on invoices. Saving here updates the whole shop at once."
        action={<AdminPrimaryButton disabled={!dirty} onClick={save}><span className="inline-flex items-center gap-2"><Save size={14} /> {dirty ? 'Save details' : 'Saved'}</span></AdminPrimaryButton>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="admin-card rounded-2xl p-5">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-400">Completeness</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-ink">{filled} of {completeness.length}</p>
          <p className="mt-2 text-xs text-stone-500">Fields filled in. Missing values are hidden on the storefront instead of showing a blank.</p>
        </div>
        <div className="admin-card flex flex-col justify-between rounded-2xl p-5">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-400">Check the live page</p>
            <p className="mt-2 text-xs leading-5 text-stone-500">Open the storefront contact page in a new tab to confirm the details read correctly.</p>
          </div>
          <Link to="/contact" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-goldInk">View contact page <ExternalLink size={13} /></Link>
        </div>
      </div>

      <AdminFeedback error={feedback.error} success={feedback.success} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <AdminSectionCard title="Business details" description="Used on the contact page, the footer and every printed document.">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Business name" required>
                <AdminInput value={draft.businessName || ''} onChange={(event) => setField('businessName', event.target.value)} />
              </AdminField>
              <AdminField label="Phone number" required>
                <AdminInput value={draft.phone || ''} onChange={(event) => setField('phone', event.target.value)} placeholder="9488821144" />
              </AdminField>
              <AdminField label="Second phone number" hint="Listed above the first number on the contact page and in the footer.">
                <AdminInput value={draft.phoneAlt || ''} onChange={(event) => setField('phoneAlt', event.target.value)} placeholder="9442521144" />
              </AdminField>
              <AdminField label="Email address" required>
                <AdminInput type="email" value={draft.email || ''} onChange={(event) => setField('email', event.target.value)} />
              </AdminField>
              <AdminField label="Business hours">
                <AdminInput value={draft.businessHours || ''} onChange={(event) => setField('businessHours', event.target.value)} placeholder="Sunday to Saturday, 8 AM to 8 PM" />
              </AdminField>
              <AdminField label="Address" required className="sm:col-span-2">
                <AdminTextarea rows={2} value={draft.address || ''} onChange={(event) => setField('address', event.target.value)} />
              </AdminField>
              <AdminField label="City">
                <AdminInput value={draft.city || ''} onChange={(event) => setField('city', event.target.value)} />
              </AdminField>
              <AdminField label="State">
                <AdminInput value={draft.state || ''} onChange={(event) => setField('state', event.target.value)} />
              </AdminField>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="WhatsApp and social links" description="The WhatsApp link is the enquiry button shoppers tap on the contact page and in the footer. Each social icon appears in the footer under the brand line as soon as its link is filled in.">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="WhatsApp link" className="sm:col-span-2" hint="Use the full international link, for example https://wa.me/919442521144">
                <AdminInput value={socialDraft.whatsapp || ''} onChange={(event) => setSocialField('whatsapp', event.target.value)} />
              </AdminField>
              <AdminField label="Instagram" hint="Paste the page link, or just the handle.">
                <AdminInput placeholder="instagram.com/anishenterprises" value={socialDraft.instagram || ''} onChange={(event) => setSocialField('instagram', event.target.value)} />
              </AdminField>
              <AdminField label="Facebook" hint="Paste the page link, or just the handle.">
                <AdminInput placeholder="facebook.com/anishenterprises" value={socialDraft.facebook || ''} onChange={(event) => setSocialField('facebook', event.target.value)} />
              </AdminField>
              <AdminField label="LinkedIn" hint="Paste the company page link.">
                <AdminInput placeholder="linkedin.com/company/anish-enterprises" value={socialDraft.linkedin || ''} onChange={(event) => setSocialField('linkedin', event.target.value)} />
              </AdminField>
              <AdminField label="YouTube" hint="Paste the channel link, or just the handle.">
                <AdminInput placeholder="youtube.com/@anishenterprises" value={socialDraft.youtube || ''} onChange={(event) => setSocialField('youtube', event.target.value)} />
              </AdminField>
            </div>
            <p className="mt-4 text-[0.68rem] leading-5 text-stone-400">
              Leave a field empty and that icon stays hidden, so the footer never shows a link that opens nothing.
            </p>
          </AdminSectionCard>

          <AdminSectionCard title="Map" description="The contact page embeds this location. Google blocks framing share links, so keep the embed URL separate.">
            <div className="space-y-4">
              <AdminField label="Map link customers click">
                <AdminInput value={draft.mapUrl || ''} onChange={(event) => setField('mapUrl', event.target.value)} />
              </AdminField>
              <AdminField label="Map embed URL" hint="Opens in the contact page frame.">
                <AdminInput value={draft.mapEmbedUrl || ''} onChange={(event) => setField('mapEmbedUrl', event.target.value)} />
              </AdminField>
            </div>
          </AdminSectionCard>

          <AdminFormActions>
            <AdminGhostButton onClick={() => { setDraft({ ...contact }); setSocialDraft({ ...social }); feedback.clear(); }}>Discard changes</AdminGhostButton>
            <AdminPrimaryButton disabled={!dirty} onClick={save}>Save contact details</AdminPrimaryButton>
          </AdminFormActions>
        </div>

        <div className="space-y-6">
          <AdminSectionCard title="Preview" description="How the storefront presents these details.">
            <div className="rounded-2xl border border-tintEdge bg-cream p-5">
              <h3 className="font-display text-2xl tracking-[-0.03em] text-ink">{contact.businessName || 'Your business name'}</h3>
              <ul className="mt-4 space-y-3 text-xs text-stone-600">
                <li className="flex items-start gap-2.5"><Phone size={15} className="mt-0.5 shrink-0 text-goldInk" />{contact.phoneAlt || 'No second phone number yet'}</li>
                <li className="flex items-start gap-2.5"><Phone size={15} className="mt-0.5 shrink-0 text-goldInk" />{contact.phone || 'No phone number yet'}</li>
                <li className="flex items-start gap-2.5"><Mail size={15} className="mt-0.5 shrink-0 text-goldInk" />{contact.email || 'No email address yet'}</li>
                <li className="flex items-start gap-2.5"><MapPin size={15} className="mt-0.5 shrink-0 text-goldInk" />{[contact.address, contact.city, contact.state].filter(Boolean).join(', ') || 'No address yet'}</li>
                <li className="flex items-start gap-2.5"><Clock size={15} className="mt-0.5 shrink-0 text-goldInk" />{contact.businessHours || 'No business hours yet'}</li>
                <li className="flex items-start gap-2.5"><MessageCircle size={15} className="mt-0.5 shrink-0 text-goldInk" />{social.whatsapp ? 'WhatsApp link active' : 'No WhatsApp link yet'}</li>
              </ul>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Where these details appear">
            <ul className="space-y-2.5 text-xs leading-5 text-stone-500">
              <li>Contact page hero and details block.</li>
              <li>Footer contact column and social icons.</li>
              <li>Printed order sheets and invoices, in the masthead.</li>
              <li>Order records created from the storefront.</li>
            </ul>
          </AdminSectionCard>

          <PreviewNotice tone="blue">
            Saving writes to this browser. On a device with no records yet, the seeded values above are used. Sharing a device shares these details, so change anything that should not be public.
          </PreviewNotice>

          <AdminSectionCard title="Quick copy" description="Handy text for enquiries and invoices.">
            <AdminDataList
              items={[
                { label: 'One-line address', value: [contact.address, contact.city].filter(Boolean).join(', ') || 'Not set' },
                { label: 'Phone numbers', value: [contact.phoneAlt, contact.phone].filter(Boolean).join(' · ') || 'Not set' },
                { label: 'WhatsApp number', value: String(social.whatsapp || '').replace('https://wa.me/', '') || 'Not set' },
                { label: 'Invoice prefix', value: 'INV-<year>-0001' },
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminTinyButton
                onClick={() => {
                  const text = [contact.businessName, contact.address, contact.city, contact.phoneAlt, contact.phone, contact.email].filter(Boolean).join('\n');
                  navigator.clipboard?.writeText(text);
                }}
              >
                Copy business block
              </AdminTinyButton>
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}
