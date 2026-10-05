import { ClipboardList, Eye, Mail, MapPin, Phone, Search, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { listEnquiries, updateEnquiryStatus } from '../services/enquiries';
import { formatCurrency } from '../utils/format';
import { AdminPageHeader, AdminStatCard, EmptyAdminState, Modal, PreviewNotice, StatusPill, ValidationMessage } from './AdminUI';

const statusOptions = ['Received', 'Contacted', 'Quoted', 'Closed'];

const statusTone = { Received: 'orange', Contacted: 'blue', Quoted: 'violet', Closed: 'green' };

export function AdminEnquiriesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [enquiries, setEnquiries] = useState(() => listEnquiries());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enquiries.filter((enquiry) => {
      const matchesStatus = statusFilter === 'all' || enquiry.status === statusFilter;
      const matchesSearch = !term || [enquiry.reference, enquiry.name, enquiry.mobile, enquiry.email, enquiry.city].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [enquiries, search, statusFilter]);

  const changeStatus = (reference, status) => {
    setEnquiries(updateEnquiryStatus(reference, status));
    setSelected((current) => (current && current.reference === reference ? { ...current, status } : current));
  };

  const totals = useMemo(() => ({
    open: enquiries.filter((enquiry) => enquiry.status !== 'Closed').length,
    listings: enquiries.reduce((sum, enquiry) => sum + enquiry.items.reduce((inner, item) => inner + item.quantity, 0), 0),
    value: enquiries.reduce((sum, enquiry) => sum + (enquiry.indicativeTotal || 0), 0),
  }), [enquiries]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Enquiry management"
        title="Enquiries"
        description="Enquiries submitted through the storefront enquiry form. Each one is a request for pricing and availability, not an order."
        action={<button className="btn-secondary" type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear filters</button>}
      />

      <PreviewNotice>
        <strong>Frontend only.</strong> Enquiries are stored in this browser&apos;s local storage. No server, database or notification is connected, and nothing here is a confirmed order or payment.
      </PreviewNotice>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Total enquiries" value={enquiries.length} note="Submitted from the storefront" icon={ClipboardList} />
        <AdminStatCard label="Open" value={totals.open} note="Not yet closed" icon={UserRound} tone="blue" />
        <AdminStatCard label="Indicative value" value={formatCurrency(totals.value)} note={`${totals.listings} listings requested`} icon={MapPin} tone="green" />
      </div>

      {enquiries.length === 0 ? (
        <EmptyAdminState
          icon={ClipboardList}
          title="No enquiries yet"
          copy="When a visitor submits the enquiry form, their request appears here with the listings, quantities and contact details they shared."
        />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex max-w-md flex-1 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-3 text-stone-400">
              <Search size={16} />
              <input className="w-full bg-transparent text-sm text-ink outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, name, mobile or city" aria-label="Search enquiries" />
            </label>
            <label className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-3 text-stone-400">
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em]">Status</span>
              <select className="bg-transparent text-xs font-bold text-ink outline-none" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                <option value="all">All</option>
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Reference</th><th>Customer</th><th>Contact</th><th>Received</th><th>Listings</th><th>Indicative value</th><th>Status</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {filtered.map((enquiry) => (
                  <tr key={enquiry.reference}>
                    <td className="font-bold text-ink">{enquiry.reference}</td>
                    <td><span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-marigold/30 bg-secondarySoft text-goldInk"><UserRound size={13} /></span>{enquiry.name}</span></td>
                    <td><span className="flex flex-col gap-1 text-xs"><span className="flex items-center gap-1.5"><Phone size={12} className="text-stone-300" />{enquiry.mobile}</span>{enquiry.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-stone-300" />{enquiry.email}</span>}</span></td>
                    <td className="text-xs">{new Date(enquiry.createdAt).toLocaleString('en-IN')}</td>
                    <td className="font-bold">{enquiry.items.length}</td>
                    <td className="font-bold text-ink">{formatCurrency(enquiry.indicativeTotal)}</td>
                    <td><StatusPill tone={statusTone[enquiry.status] || 'slate'}>{enquiry.status}</StatusPill></td>
                    <td><button type="button" onClick={() => setSelected(enquiry)} className="inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-goldInk">View <Eye size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div className="p-10 text-center text-sm text-stone-500">No enquiries match your filters.</div>}
          </div>
        </section>
      )}

      {selected && <EnquiryDetails enquiry={selected} onClose={() => setSelected(null)} onStatusChange={changeStatus} />}
    </div>
  );
}

function EnquiryDetails({ enquiry, onClose, onStatusChange }) {
  return (
    <Modal title={enquiry.reference} description={`Received ${new Date(enquiry.createdAt).toLocaleString('en-IN')}`} onClose={onClose} wide>
      <div className="grid gap-5 sm:grid-cols-3">
        <Detail label="Customer" value={enquiry.name} note={enquiry.mobile} />
        <Detail label="Reply via" value={enquiry.preferredContact} note={enquiry.email} />
        <Detail label="Delivery" value={enquiry.city || 'Not provided'} note={[enquiry.address, enquiry.pin].filter(Boolean).join(' · ')} />
      </div>

      {enquiry.notes && <div className="mt-5 rounded-xl bg-secondarySoft p-4"><p className="field-label">Customer note</p><p className="mt-2 text-sm leading-6 text-stone-600">{enquiry.notes}</p></div>}

      <div className="mt-6">
        <p className="field-label">Requested listings</p>
        <div className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-100">
          {enquiry.items.map((item) => (
            <div className="flex items-center justify-between gap-4 p-3" key={item.id}>
              <div><p className="text-xs font-bold text-ink">{item.name}</p><p className="mt-1 text-[0.62rem] text-stone-400">{item.category} · {item.packSize} · Qty {item.quantity}</p></div>
              <p className="text-xs font-bold text-ink">{formatCurrency(item.customerPrice * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-stone-200 pt-5">
        <div>
          <p className="field-label">Update status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button key={status} type="button" onClick={() => onStatusChange(enquiry.reference, status)} className={`rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] transition ${enquiry.status === status ? 'border-ember bg-ember text-white' : 'border-stone-200 text-stone-600 hover:border-ink'}`}>{status}</button>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-stone-400">Indicative value</p>
          <p className="mt-1 text-2xl font-bold text-goldInk">{formatCurrency(enquiry.indicativeTotal)}</p>
        </div>
      </div>

      <ValidationMessage>Confirm the final price and availability with the customer before treating this as a confirmed order.</ValidationMessage>

      <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
        <p className="text-[0.65rem] text-stone-400">Stored in this browser only.</p>
        <Trash2 className="text-stone-200" size={16} />
      </div>
    </Modal>
  );
}

function Detail({ label, value, note }) {
  return (
    <div className="rounded-xl bg-secondarySoft p-4">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-sm font-bold text-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </div>
  );
}
