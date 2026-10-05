import { Banknote, Download, Eye, FileSpreadsheet, FileText, IndianRupee, Plus, Printer, Search, Trash2, Truck, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { useCatalog } from '../hooks/useCatalog';
import { useOrders } from '../hooks/useOrders';
import {
  createOrder,
  deleteOrder,
  getOrderStats,
  listOrders,
  orderProgress,
  orderStatuses,
  orderStatusLabels,
  orderStatusTone,
  orderUnitCount,
  dateRange,
  outstandingAmount,
  paymentStatuses,
  paymentStatusTone,
  updateOrderDetails,
  updateOrderPayment,
  updateOrderStatus,
} from '../services/orders';
import { downloadOrderExcel, downloadOrderWord, downloadOrdersCsv, downloadOrdersExcel, downloadOrdersWord, printOrderDocument, printOrdersDocument } from '../utils/documents';
import { formatCurrency, formatDate } from '../utils/format';
import {
  AdminFeedback,
  AdminFormActions,
  AdminField,
  AdminGhostButton,
  AdminInput,
  AdminPageHeader,
  AdminPrimaryButton,
  AdminSearch,
  AdminSectionCard,
  AdminSelect,
  AdminStatCard,
  AdminTabs,
  AdminTextarea,
  AdminTinyButton,
  ConfirmDialog,
  EmptyAdminState,
  Modal,
  StatusPill,
  useAdminFeedback,
} from './AdminUI';

const pipeline = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

const rangeOptions = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

const relativeDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return formatDate(value);
};

const businessDetails = (siteContent) => {
  const contact = siteContent?.contact || {};
  return {
    businessName: contact.businessName || 'Anish Enterprises',
    address: [contact.address, contact.city, contact.state].filter(Boolean).join(', '),
    city: contact.city,
    state: contact.state,
    phone: contact.phone,
    email: contact.email,
  };
};

export function AdminOrdersPage() {
  const { siteContent } = useContent();
  const feedback = useAdminFeedback();
  const [orders, setOrders] = useOrders();
  const [status, setStatus] = useState('All');
  const [payment, setPayment] = useState('all');
  const [range, setRange] = useState('all');
  const [search, setSearch] = useState('');
  const [openReference, setOpenReference] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // A notification links to one order, so ?order= opens that order's details. The
  // parameter is cleared on close so a refresh does not reopen it.
  useEffect(() => {
    const reference = searchParams.get('order');
    if (reference) setOpenReference(reference);
  }, [searchParams]);

  const closeOrder = () => {
    setOpenReference('');
    if (searchParams.get('order')) {
      const next = new URLSearchParams(searchParams);
      next.delete('order');
      setSearchParams(next, { replace: true });
    }
  };

  const business = businessDetails(siteContent);
  const stats = useMemo(() => getOrderStats(orders), [orders]);

  const refresh = () => setOrders(listOrders());

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    // dateRange owns the calendar maths so the presets here match the ones in reports.
    const from = dateRange(range).from;
    return orders.filter((order) => {
      if (status !== 'All' && order.status !== status) return false;
      if (payment !== 'all' && order.paymentStatus !== payment) return false;
      if (from && new Date(order.createdAt) < from) return false;
      if (!needle) return true;
      const haystack = [
        order.reference,
        order.invoiceNumber,
        order.customer?.name,
        order.customer?.mobile,
        order.customer?.city,
        order.status,
        ...(order.items || []).map((line) => line.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [orders, status, payment, range, search]);

  const tabs = useMemo(
    () => [
      { value: 'All', label: 'All orders', count: orders.length },
      ...orderStatuses.map((value) => ({ value, label: orderStatusLabels[value], count: stats.byStatus[value] })),
    ],
    [orders.length, stats.byStatus],
  );

  const activeOrder = openReference ? orders.find((order) => order.reference === openReference) || null : null;

  const exportOptions = {
    title: `Order list (${status === 'All' ? 'all statuses' : status})`,
    fileLabel: `orders-${status === 'All' ? 'all' : status.toLowerCase()}`,
    subtitle: `${visible.length} order${visible.length === 1 ? '' : 's'} · ${rangeOptions.find((option) => option.value === range)?.label}`,
    stats: [
      { label: 'Orders', value: String(visible.length) },
      { label: 'Value', value: formatCurrency(visible.reduce((sum, order) => sum + order.totals.grandTotal, 0)) },
      { label: 'Outstanding', value: formatCurrency(visible.reduce((sum, order) => sum + outstandingAmount(order), 0)) },
      { label: 'Units', value: String(visible.reduce((sum, order) => sum + orderUnitCount(order), 0)) },
    ],
    business,
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Order desk"
        title="Orders"
        description="Every enquiry becomes an order you can track, edit, invoice and export. Nothing here is a sample: the list is built from real enquiries and orders you create."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminTinyButton onClick={() => printOrdersDocument(visible, exportOptions)}><Printer size={13} /> Print</AdminTinyButton>
            <AdminTinyButton onClick={() => downloadOrdersWord(visible, exportOptions)}><FileText size={13} /> Word</AdminTinyButton>
            <AdminTinyButton onClick={() => downloadOrdersCsv(visible, exportOptions.fileLabel)}><Download size={13} /> CSV</AdminTinyButton>
            <AdminTinyButton onClick={() => downloadOrdersExcel(visible, exportOptions.fileLabel)}><FileSpreadsheet size={13} /> Excel</AdminTinyButton>
            <AdminPrimaryButton onClick={() => setShowNewOrder(true)}><span className="inline-flex items-center gap-2"><Plus size={14} /> New order</span></AdminPrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Orders" value={stats.total} note={`${stats.units} units across all orders`} icon={Truck} tone="orange" />
        <AdminStatCard label="Order value" value={formatCurrency(stats.revenue)} note="Excludes cancelled and refunded" icon={IndianRupee} tone="green" />
        <AdminStatCard label="Balance due" value={formatCurrency(stats.outstanding)} note="Unpaid and part-paid orders" icon={Banknote} tone="amber" />
        <AdminStatCard label="Awaiting action" value={stats.byStatus.Pending + stats.byStatus.Confirmed} note="Pending and confirmed orders" icon={Users} tone="blue" />
      </div>

      <div className="space-y-4">
        <AdminTabs tabs={tabs} value={status} onChange={setStatus} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminSearch value={search} onChange={setSearch} placeholder="Search reference, customer, item" />
          <AdminSelect value={payment} onChange={(event) => setPayment(event.target.value)}>
            <option value="all">Any payment status</option>
            {paymentStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </AdminSelect>
          <AdminSelect value={range} onChange={(event) => setRange(event.target.value)} options={rangeOptions} />
          <AdminGhostButton onClick={() => { setSearch(''); setPayment('all'); setRange('all'); setStatus('All'); }}>Clear filters</AdminGhostButton>
        </div>
      </div>

      <AdminFeedback error={feedback.error} success={feedback.success} />

      {visible.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.reference}>
                  <td>
                    <p className="font-bold text-ink">{order.reference}</p>
                    <p className="mt-0.5 text-[0.65rem] text-stone-400">{order.invoiceNumber || 'No invoice number'}</p>
                  </td>
                  <td className="whitespace-nowrap">{relativeDay(order.createdAt)}</td>
                  <td>
                    <p className="font-semibold text-ink">{order.customer?.name || 'Not recorded'}</p>
                    <p className="mt-0.5 text-[0.65rem] text-stone-400">{[order.customer?.mobile, order.customer?.city].filter(Boolean).join(' · ') || 'No contact details'}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-ink">{orderUnitCount(order)} units</p>
                    <p className="mt-0.5 max-w-[16rem] truncate text-[0.65rem] text-stone-400">{(order.items || []).map((line) => line.name).join(', ')}</p>
                  </td>
                  <td><StatusPill tone={orderStatusTone[order.status]}>{order.status}</StatusPill></td>
                  <td>
                    <StatusPill tone={paymentStatusTone[order.paymentStatus]}>{order.paymentStatus}</StatusPill>
                    {outstandingAmount(order) > 0 && <p className="mt-1 text-[0.65rem] font-bold text-rose-600">{formatCurrency(outstandingAmount(order))} due</p>}
                  </td>
                  <td className="text-right font-bold text-ink">{formatCurrency(order.totals.grandTotal)}</td>
                  <td className="text-right">
                    <button type="button" onClick={() => setOpenReference(order.reference)} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink hover:text-ink">
                      <Eye size={13} /> Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyAdminState icon={Search} title="No orders match" copy="Change the filters, or create an order by hand if a customer ordered over the phone.">
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <AdminPrimaryButton onClick={() => setShowNewOrder(true)}><span className="inline-flex items-center gap-2"><Plus size={14} /> New order</span></AdminPrimaryButton>
            <AdminGhostButton onClick={() => { setSearch(''); setPayment('all'); setRange('all'); setStatus('All'); }}>Clear filters</AdminGhostButton>
          </div>
        </EmptyAdminState>
      )}

      {activeOrder && (
        <OrderDetailModal
          order={activeOrder}
          business={business}
          onClose={closeOrder}
          onChanged={() => { refresh(); feedback.clear(); }}
          onStatusChange={(next, note) => {
            updateOrderStatus(activeOrder.reference, next, note);
            refresh();
            feedback.notify(`Order moved to ${next}.`);
          }}
          onPaymentChange={(patch) => {
            updateOrderPayment(activeOrder.reference, patch);
            refresh();
            feedback.notify('Payment updated.');
          }}
          onSave={(patch) => {
            updateOrderDetails(activeOrder.reference, patch);
            refresh();
            feedback.notify('Order saved.');
          }}
          onDelete={() => setConfirmDelete(activeOrder.reference)}
        />
      )}

      {showNewOrder && (
        <NewOrderModal
          business={business}
          onClose={() => setShowNewOrder(false)}
          onCreated={(reference) => {
            refresh();
            setShowNewOrder(false);
            setOpenReference(reference);
            feedback.notify(`Order ${reference} created.`);
          }}
          onError={feedback.fail}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this order?"
          description="The order and its record of status changes will be removed. This cannot be undone."
          confirmLabel="Delete order"
          tone="red"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteOrder(confirmDelete);
            setConfirmDelete(null);
            setOpenReference('');
            refresh();
            feedback.notify('Order deleted.');
          }}
        >
          <p className="text-sm text-stone-600">Reference <span className="font-bold text-ink">{confirmDelete}</span> will be gone from the order list, reports and customer history.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function OrderDetailModal({ order, business, onClose, onChanged, onStatusChange, onPaymentChange, onSave, onDelete }) {
  const { catalog, tiles } = useCatalog();
  const [draft, setDraft] = useState(() => ({
    customer: { ...order.customer },
    items: order.items.map((line) => ({ ...line })),
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    notes: order.notes,
    internalNotes: order.internalNotes,
    channel: order.channel,
    paymentMode: order.paymentMode,
    invoiceNumber: order.invoiceNumber,
  }));
  const [picker, setPicker] = useState('');
  const [pickerError, setPickerError] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [dirty, setDirty] = useState(false);

  const setCustomerField = (field, value) => {
    setDraft((current) => ({ ...current, customer: { ...current.customer, [field]: value } }));
    setDirty(true);
  };

  const setLine = (index, patch) => {
    setDraft((current) => ({ ...current, items: current.items.map((line, position) => (position === index ? { ...line, ...patch } : line)) }));
    setDirty(true);
  };

  const setField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const removeLine = (index) => {
    setDraft((current) => ({ ...current, items: current.items.filter((line, position) => position !== index) }));
    setDirty(true);
  };

  const addFromCatalog = () => {
    const needle = picker.trim().toLowerCase();
    if (!needle) return;
    const product = catalog.catalogProducts.find((entry) => entry.code.toLowerCase() === needle || entry.id.toLowerCase() === needle || entry.name.toLowerCase() === needle);
    const pack = tiles.find((entry) => entry.id.toLowerCase() === needle || entry.name.toLowerCase() === needle);
    const match = product || pack;
    if (!match) {
      setPickerError('No product or pack matches that code or name.');
      return;
    }
    setPickerError('');
    setPicker('');
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: match.id,
          code: match.code,
          name: match.name,
          category: match.category,
          kind: match.kind === 'combo' || match.kind === 'gift-box' ? 'Combo pack' : 'Product',
          packSize: match.packSize,
          quantity: 1,
          unitPrice: Number(match.price) || 0,
        },
      ],
    }));
    setDirty(true);
  };

  const previewTotals = useMemo(() => {
    const itemsTotal = draft.items.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0), 0);
    return {
      itemsTotal: Math.round(itemsTotal * 100) / 100,
      grandTotal: Math.round(Math.max(0, itemsTotal + (Number(draft.deliveryFee) || 0) - (Number(draft.discount) || 0)) * 100) / 100,
    };
  }, [draft.items, draft.deliveryFee, draft.discount]);

  return (
    <Modal title={order.reference} description={`${orderStatusLabels[order.status]} · ${order.paymentStatus} · placed ${relativeDay(order.createdAt)}`} onClose={onClose} wide>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tintEdge bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-400">Fulfilment</p>
            <StatusPill tone={orderStatusTone[order.status]}>{order.status}</StatusPill>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {pipeline.map((step, index) => {
              const current = orderProgress(order);
              const done = index < current;
              const active = index === current;
              return <span key={step} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] ${active ? 'bg-ember text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>{step}</span>;
            })}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <AdminField label="Move to status" hint="Cancelled can be reopened by setting a pipeline status.">
              <AdminSelect value={order.status} onChange={(event) => onStatusChange(event.target.value, statusNote)}>
                {orderStatuses.map((value) => <option key={value} value={value}>{orderStatusLabels[value]}</option>)}
              </AdminSelect>
            </AdminField>
            <AdminField label="Note (optional)">
              <AdminInput value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Called and confirmed" />
            </AdminField>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminSectionCard title="Customer" description="These details print on the invoice and make up the customer directory.">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Name"><AdminInput value={draft.customer.name || ''} onChange={(event) => setCustomerField('name', event.target.value)} /></AdminField>
              <AdminField label="Phone"><AdminInput value={draft.customer.mobile || ''} onChange={(event) => setCustomerField('mobile', event.target.value)} /></AdminField>
              <AdminField label="Email"><AdminInput type="email" value={draft.customer.email || ''} onChange={(event) => setCustomerField('email', event.target.value)} /></AdminField>
              <AdminField label="City"><AdminInput value={draft.customer.city || ''} onChange={(event) => setCustomerField('city', event.target.value)} /></AdminField>
              <AdminField label="Pin code"><AdminInput value={draft.customer.pin || ''} onChange={(event) => setCustomerField('pin', event.target.value)} /></AdminField>
              <AdminField label="Occasion"><AdminInput value={draft.customer.occasion || ''} onChange={(event) => setCustomerField('occasion', event.target.value)} /></AdminField>
              <AdminField label="Address" className="sm:col-span-2"><AdminTextarea rows={2} value={draft.customer.address || ''} onChange={(event) => setCustomerField('address', event.target.value)} /></AdminField>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Payment" description="Part payments keep the balance visible on the order and in reports.">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Payment status">
                <AdminSelect value={order.paymentStatus} onChange={(event) => onPaymentChange({ paymentStatus: event.target.value })}>
                  {paymentStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
                </AdminSelect>
              </AdminField>
              <AdminField label="Amount received" hint="Leave 0 for unpaid or advance pending.">
                <AdminInput type="number" min="0" step="0.01" value={order.paidAmount || 0} onChange={(event) => onPaymentChange({ paidAmount: Number(event.target.value) || 0 })} />
              </AdminField>
              <AdminField label="Payment mode" className="sm:col-span-2">
                <AdminInput value={order.paymentMode || ''} onChange={(event) => setField('paymentMode', event.target.value)} />
              </AdminField>
              <AdminField label="Invoice number" className="sm:col-span-2">
                <AdminInput value={draft.invoiceNumber} onChange={(event) => setField('invoiceNumber', event.target.value)} />
              </AdminField>
            </div>
            <div className="mt-4 rounded-xl bg-secondarySoft p-4 text-xs text-stone-600">
              <p className="flex items-center justify-between"><span>Order total</span><span className="font-bold text-ink">{formatCurrency(previewTotals.grandTotal)}</span></p>
              <p className="mt-1.5 flex items-center justify-between"><span>Received</span><span className="font-bold text-ink">{formatCurrency(order.paidAmount || 0)}</span></p>
              <p className="mt-1.5 flex items-center justify-between border-t border-tintEdge pt-1.5"><span>Balance due</span><span className="font-bold text-goldInk">{formatCurrency(Math.max(0, previewTotals.grandTotal - (Number(order.paidAmount) || 0)))}</span></p>
            </div>
          </AdminSectionCard>
        </div>

        <AdminSectionCard title="Items" description="Adjust quantity or rate, remove a line, or add another catalog item or pack.">
          <div className="space-y-2.5">
            {draft.items.map((line, index) => (
              <div key={`${line.id}-${index}`} className="rounded-xl border border-stone-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{line.name}</p>
                    <p className="mt-0.5 text-[0.65rem] text-stone-400">{[line.code, line.category, line.kind].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button type="button" onClick={() => removeLine(index)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${line.name}`}><X size={15} /></button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <AdminField label="Quantity"><AdminInput type="number" min="1" value={line.quantity} onChange={(event) => setLine(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></AdminField>
                  <AdminField label="Rate"><AdminInput type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => setLine(index, { unitPrice: Number(event.target.value) || 0 })} /></AdminField>
                  <AdminField label="Line total"><div className="rounded-xl bg-stone-50 px-3.5 py-2.5 text-sm font-bold text-ink">{formatCurrency((Number(line.unitPrice) || 0) * (Number(line.quantity) || 0))}</div></AdminField>
                </div>
              </div>
            ))}
            {!draft.items.length && <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-xs text-stone-500">No items on this order yet. Add one below.</p>}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <AdminField label="Add a product or pack" error={pickerError} hint="Type an exact code or name, for example SS26-007 or Wala Family Pack.">
              <AdminInput list="admin-catalog-picker" value={picker} onChange={(event) => setPicker(event.target.value)} placeholder="Code or product name" />
            </AdminField>
            <div className="flex items-end">
              <AdminGhostButton onClick={addFromCatalog}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add</span></AdminGhostButton>
            </div>
          </div>
          <datalist id="admin-catalog-picker">
            {[...catalog.catalogProducts.map((entry) => ({ id: entry.id, code: entry.code, name: entry.name, price: entry.price })), ...tiles.map((entry) => ({ id: entry.id, code: entry.code, name: entry.name, price: entry.price }))].map((entry) => (
              <option key={entry.id} value={entry.code || entry.name}>{entry.name}</option>
            ))}
          </datalist>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AdminField label="Delivery charge"><AdminInput type="number" min="0" step="0.01" value={draft.deliveryFee} onChange={(event) => setField('deliveryFee', Number(event.target.value) || 0)} /></AdminField>
            <AdminField label="Order discount"><AdminInput type="number" min="0" step="0.01" value={draft.discount} onChange={(event) => setField('discount', Number(event.target.value) || 0)} /></AdminField>
          </div>
        </AdminSectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminSectionCard title="Notes" description="The customer note prints on the order sheet. The internal note never leaves the panel.">
            <div className="space-y-3">
              <AdminField label="Customer note"><AdminTextarea value={draft.notes} onChange={(event) => setField('notes', event.target.value)} /></AdminField>
              <AdminField label="Internal note"><AdminTextarea value={draft.internalNotes} onChange={(event) => setField('internalNotes', event.target.value)} /></AdminField>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="History & documents" description="Every status change is recorded with its timestamp.">
            <ol className="space-y-2.5">
              {(order.history || []).slice().reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="flex items-start gap-3 text-xs">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ember" />
                  <div>
                    <p className="font-bold text-ink">{entry.from ? `${entry.from} to ${entry.to}` : entry.to}</p>
                    <p className="mt-0.5 text-stone-400">{relativeDay(entry.at)}{entry.note ? ` · ${entry.note}` : ''}</p>
                  </div>
                </li>
              ))}
              {!(order.history || []).length && <li className="text-xs text-stone-400">No status changes recorded yet.</li>}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-tintEdge pt-4">
              <AdminTinyButton tone="ember" onClick={() => printOrderDocument(order, business)}><Printer size={13} /> Print / PDF</AdminTinyButton>
              <AdminTinyButton onClick={() => downloadOrderWord(order, business)}><FileText size={13} /> Word</AdminTinyButton>
              <AdminTinyButton onClick={() => downloadOrderExcel(order)}><FileSpreadsheet size={13} /> Excel</AdminTinyButton>
            </div>
          </AdminSectionCard>
        </div>

        <AdminFormActions>
          <AdminTinyButton tone="red" onClick={onDelete}><span className="inline-flex items-center gap-1.5"><Trash2 size={13} /> Delete order</span></AdminTinyButton>
          <AdminGhostButton onClick={onChanged}>Discard changes</AdminGhostButton>
          <AdminPrimaryButton
            disabled={!dirty}
            onClick={() => {
              onSave(draft);
              setDirty(false);
            }}
          >
            {dirty ? 'Save order' : 'Saved'}
          </AdminPrimaryButton>
        </AdminFormActions>
      </div>
    </Modal>
  );
}

function NewOrderModal({ onClose, onCreated, onError }) {
  const { catalog, tiles } = useCatalog();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', mobile: '', email: '', address: '', city: '', pin: '', occasion: '', preferredContact: 'Phone call', notes: '', channel: 'Phone call', paymentMode: 'Cash on delivery' });
  const [picker, setPicker] = useState('');
  const [busy, setBusy] = useState(false);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const addFromCatalog = () => {
    const needle = picker.trim().toLowerCase();
    if (!needle) return;
    const match =
      catalog.catalogProducts.find((entry) => entry.code.toLowerCase() === needle || entry.id.toLowerCase() === needle || entry.name.toLowerCase() === needle) ||
      tiles.find((entry) => entry.id.toLowerCase() === needle || entry.name.toLowerCase() === needle);
    if (!match) return;
    setItems((current) => [
      ...current,
      { id: match.id, code: match.code, name: match.name, category: match.category, kind: match.kind ? 'Combo pack' : 'Product', packSize: match.packSize, quantity: 1, unitPrice: Number(match.price) || 0 },
    ]);
    setPicker('');
  };

  const total = items.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0), 0);

  const submit = () => {
    if (!form.name.trim() && !form.mobile.trim()) {
      onError('Enter at least a customer name or phone number.');
      return;
    }
    if (!items.length) {
      onError('Add at least one item to the order.');
      return;
    }
    setBusy(true);
    try {
      const { name, mobile, email, address, city, pin, occasion, preferredContact, notes, channel, paymentMode } = form;
      const order = createOrder({
        customer: { name, mobile, email, address, city, pin, occasion, preferredContact, notes },
        notes,
        channel,
        paymentMode,
        items,
        status: 'Pending',
        paymentStatus: 'Unpaid',
      });
      onCreated(order.reference);
    } catch (error) {
      onError(error);
      setBusy(false);
    }
  };

  return (
    <Modal title="New order" description="Use this for walk-ins and phone orders. Enquiries arrive here on their own." onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Customer name"><AdminInput value={form.name} onChange={(event) => setField('name', event.target.value)} /></AdminField>
          <AdminField label="Phone"><AdminInput value={form.mobile} onChange={(event) => setField('mobile', event.target.value)} /></AdminField>
          <AdminField label="Email"><AdminInput type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} /></AdminField>
          <AdminField label="City"><AdminInput value={form.city} onChange={(event) => setField('city', event.target.value)} /></AdminField>
          <AdminField label="Address" className="sm:col-span-2"><AdminTextarea rows={2} value={form.address} onChange={(event) => setField('address', event.target.value)} /></AdminField>
          <AdminField label="Channel">
            <AdminSelect value={form.channel} onChange={(event) => setField('channel', event.target.value)}>
              {['Phone call', 'WhatsApp enquiry', 'Walk-in', 'Storefront enquiry', 'Repeat order'].map((value) => <option key={value} value={value}>{value}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Payment mode">
            <AdminSelect value={form.paymentMode} onChange={(event) => setField('paymentMode', event.target.value)}>
              {['Cash on delivery', 'Paid by UPI', 'Advance by UPI - awaiting confirmation', 'Bank transfer', 'Enquiry - confirm by phone'].map((value) => <option key={value} value={value}>{value}</option>)}
            </AdminSelect>
          </AdminField>
        </div>

        <AdminSectionCard title="Items" description="Add catalog products and combo packs exactly as on the order.">
          <div className="space-y-2.5">
            {items.map((line, index) => (
              <div key={`${line.id}-${index}`} className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-3.5">
                <div className="min-w-[12rem] flex-1">
                  <p className="truncate text-sm font-bold text-ink">{line.name}</p>
                  <p className="text-[0.65rem] text-stone-400">{[line.code, line.kind].filter(Boolean).join(' · ')}</p>
                </div>
                <AdminField label="Qty" className="w-24">
                  <AdminInput type="number" min="1" value={line.quantity} onChange={(event) => setItems((current) => current.map((entry, position) => (position === index ? { ...entry, quantity: Math.max(1, Number(event.target.value) || 1) } : entry)))} />
                </AdminField>
                <AdminField label="Rate" className="w-32">
                  <AdminInput type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => setItems((current) => current.map((entry, position) => (position === index ? { ...entry, unitPrice: Number(event.target.value) || 0 } : entry)))} />
                </AdminField>
                <button type="button" onClick={() => setItems((current) => current.filter((entry, position) => position !== index))} className="mb-1 flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${line.name}`}><X size={15} /></button>
              </div>
            ))}
            {!items.length && <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-xs text-stone-500">No items added yet.</p>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <AdminField label="Add a product or pack" hint="Type an exact code or name.">
              <AdminInput list="admin-catalog-picker-new" value={picker} onChange={(event) => setPicker(event.target.value)} placeholder="Code or product name" />
            </AdminField>
            <div className="flex items-end">
              <AdminGhostButton onClick={addFromCatalog}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add</span></AdminGhostButton>
            </div>
          </div>
          <datalist id="admin-catalog-picker-new">
            {catalog.catalogProducts.map((entry) => <option key={entry.id} value={entry.code}>{entry.name}</option>)}
            {tiles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </datalist>
        </AdminSectionCard>

        <AdminField label="Note"><AdminTextarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} /></AdminField>

        <div className="flex items-center justify-between rounded-xl bg-secondarySoft px-4 py-3 text-sm">
          <span className="font-bold text-stone-600">Order total</span>
          <span className="font-bold text-ink">{formatCurrency(total)}</span>
        </div>

        <AdminFormActions>
          <AdminGhostButton onClick={onClose}>Cancel</AdminGhostButton>
          <AdminPrimaryButton disabled={busy} onClick={submit}><span className="inline-flex items-center gap-2"><Search size={14} /> Create order</span></AdminPrimaryButton>
        </AdminFormActions>
      </div>
    </Modal>
  );
}
