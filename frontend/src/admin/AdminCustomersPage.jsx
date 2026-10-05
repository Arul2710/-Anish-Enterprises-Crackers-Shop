import { Download, FileSpreadsheet, FileText, Phone, Printer, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { getCustomerOrders, listCustomers, orderStatusTone, orderUnitCount, outstandingAmount } from '../services/orders';
import { downloadCsv, downloadExcel, downloadWordDocument, printDocument } from '../utils/documents';
import { formatCurrency, formatDate } from '../utils/format';
import {
  AdminBarList,
  AdminDataList,
  AdminFeedback,
  AdminGhostButton,
  AdminPageHeader,
  AdminSearch,
  AdminSelect,
  AdminSectionCard,
  AdminStatCard,
  AdminTabs,
  AdminTinyButton,
  EmptyAdminState,
  Modal,
  StatusPill,
  useAdminFeedback,
} from './AdminUI';

const customerColumns = [
  { key: 'name', label: 'Customer' },
  { key: 'mobile', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'orders', label: 'Orders' },
  { key: 'units', label: 'Units' },
  { key: 'revenue', label: 'Value' },
  { key: 'lastOrderAt', label: 'Last order' },
];

export function AdminCustomersPage() {
  const [orders] = useOrders();
  const [customers] = useState(() => listCustomers(orders));
  const feedback = useAdminFeedback();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('value');
  const [segment, setSegment] = useState('all');
  const [openKey, setOpenKey] = useState(null);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      if (segment === 'repeat' && customer.orders < 2) return false;
      if (segment === 'due' && customer.outstanding <= 0) return false;
      if (segment === 'recent' && Date.now() - new Date(customer.lastOrderAt).getTime() > 90 * 86400000) return false;
      if (!needle) return true;
      return [customer.name, customer.mobile, customer.email, customer.city, ...customer.occasions].join(' ').toLowerCase().includes(needle);
    });
    return filtered.sort((first, second) => {
      if (sort === 'value') return second.revenue - first.revenue;
      if (sort === 'orders') return second.orders - first.orders;
      if (sort === 'name') return first.name.localeCompare(second.name);
      return new Date(second.lastOrderAt) - new Date(first.lastOrderAt);
    });
  }, [customers, search, sort, segment]);

  const totals = useMemo(() => ({
    revenue: customers.reduce((sum, customer) => sum + customer.revenue, 0),
    due: customers.reduce((sum, customer) => sum + customer.outstanding, 0),
    repeat: customers.filter((customer) => customer.orders > 1).length,
    average: customers.length ? customers.reduce((sum, customer) => sum + customer.revenue, 0) / customers.length : 0,
  }), [customers]);

  const byCity = useMemo(() => {
    const map = new Map();
    customers.forEach((customer) => {
      const key = customer.city || 'Not recorded';
      map.set(key, (map.get(key) || 0) + customer.revenue);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [customers]);

  const exportCustomers = (format) => {
    const rows = visible.map((customer) => ({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      city: customer.city,
      orders: customer.orders,
      units: customer.units,
      revenue: customer.revenue,
      outstanding: customer.outstanding,
      firstOrder: formatDate(customer.firstOrderAt),
      lastOrder: formatDate(customer.lastOrderAt),
      occasions: customer.occasions.join(', '),
    }));
    const columns = [
      { key: 'name', label: 'Customer' },
      { key: 'mobile', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'City' },
      { key: 'orders', label: 'Orders' },
      { key: 'units', label: 'Units' },
      { key: 'revenue', label: 'Value' },
      { key: 'outstanding', label: 'Balance due' },
      { key: 'firstOrder', label: 'First order' },
      { key: 'lastOrder', label: 'Last order' },
      { key: 'occasions', label: 'Occasions' },
    ];
    const file = `Anish-Enterprises-customers-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') downloadCsv(file, columns, rows);
    else if (format === 'excel') downloadExcel(file, { name: 'Customers', columns, rows, totals: ['Total', '', '', '', visible.length, visible.reduce((sum, row) => sum + row.units, 0), totals.revenue, totals.due, '', '', ''] });
    else if (format === 'word') {
      const body = `<header class="masthead"><div><h1>Anish Enterprises</h1><p>Customer list</p></div><div style="text-align:right"><p class="title">Customers</p></div></header>
      <table cellpadding="6" cellspacing="0" border="0"><thead><tr><th>Customer</th><th>Phone</th><th>City</th><th class="num">Orders</th><th class="num">Units</th><th class="num">Value</th><th class="num">Due</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td><strong>${row.name}</strong><div class="muted">${row.email}</div></td><td>${row.mobile}</td><td>${row.city}</td><td class="num">${row.orders}</td><td class="num">${row.units}</td><td class="num">${formatCurrency(row.revenue)}</td><td class="num">${formatCurrency(row.outstanding)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No customers yet.</td></tr>'}</tbody></table>`;
      downloadWordDocument('Customers', file, body);
    } else {
      const body = `<header class="masthead"><div><h1>Anish Enterprises</h1><p>Customer list</p></div><div style="text-align:right"><p class="title">Customers</p></div></header>
      <table cellpadding="6" cellspacing="0" border="0"><thead><tr><th>Customer</th><th>Phone</th><th>City</th><th class="num">Orders</th><th class="num">Units</th><th class="num">Value</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td><strong>${row.name}</strong></td><td>${row.mobile}</td><td>${row.city}</td><td class="num">${row.orders}</td><td class="num">${row.units}</td><td class="num">${formatCurrency(row.revenue)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No customers yet.</td></tr>'}</tbody></table>`;
      printDocument('Customers', body, { wide: true });
    }
  };

  const openCustomer = openKey ? customers.find((customer) => customer.key === openKey) || null : null;

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="People"
        title="Customers"
        description="The customer list is not maintained by hand: it is everyone who has placed an order, matched on phone number and email, with their live order history."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminTinyButton onClick={() => exportCustomers('print')}><Printer size={13} /> Print</AdminTinyButton>
            <AdminTinyButton onClick={() => exportCustomers('word')}><FileText size={13} /> Word</AdminTinyButton>
            <AdminTinyButton onClick={() => exportCustomers('csv')}><Download size={13} /> CSV</AdminTinyButton>
            <AdminTinyButton onClick={() => exportCustomers('excel')}><FileSpreadsheet size={13} /> Excel</AdminTinyButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Customers" value={customers.length} note="From real orders only" icon={Users} />
        <AdminStatCard label="Customer value" value={formatCurrency(totals.revenue)} note={`Average ${formatCurrency(Math.round(totals.average))} per customer`} icon={TrendingUp} tone="green" />
        <AdminStatCard label="Repeat customers" value={totals.repeat} note="More than one order" icon={ShoppingBag} tone="blue" />
        <AdminStatCard label="Balance due" value={formatCurrency(totals.due)} note="Across all customers" icon={Phone} tone="amber" />
      </div>

      <div className="space-y-4">
        <AdminTabs
          tabs={[
            { value: 'all', label: 'All', count: customers.length },
            { value: 'repeat', label: 'Repeat', count: totals.repeat },
            { value: 'due', label: 'Balance due', count: customers.filter((customer) => customer.outstanding > 0).length },
            { value: 'recent', label: 'Last 90 days', count: customers.filter((customer) => Date.now() - new Date(customer.lastOrderAt).getTime() <= 90 * 86400000).length },
          ]}
          value={segment}
          onChange={setSegment}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminSearch value={search} onChange={setSearch} placeholder="Search name, phone, city" />
          <AdminSelect value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="value">Sort by value</option>
            <option value="orders">Sort by order count</option>
            <option value="recent">Sort by recent order</option>
            <option value="name">Sort by name</option>
          </AdminSelect>
          <AdminGhostButton onClick={() => { setSearch(''); setSegment('all'); setSort('value'); }}>Clear filters</AdminGhostButton>
        </div>
      </div>

      <AdminFeedback error={feedback.error} success={feedback.success} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {visible.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {customerColumns.map((column) => <th key={column.key} className={column.key === 'revenue' ? 'text-right' : ''}>{column.label}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((customer) => (
                  <tr key={customer.key}>
                    <td>
                      <p className="font-bold text-ink">{customer.name}</p>
                      <p className="mt-0.5 text-[0.65rem] text-stone-400">{[customer.email, customer.occasions[0]].filter(Boolean).join(' · ') || 'No email recorded'}</p>
                    </td>
                    <td>{customer.mobile || 'Not recorded'}</td>
                    <td>{customer.city || 'Not recorded'}</td>
                    <td>{customer.orders}</td>
                    <td>{customer.units}</td>
                    <td className="text-right font-bold text-ink">
                      {formatCurrency(customer.revenue)}
                      {customer.outstanding > 0 && <span className="mt-0.5 block text-[0.65rem] font-bold text-rose-600">{formatCurrency(customer.outstanding)} due</span>}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(customer.lastOrderAt)}</td>
                    <td className="text-right">
                      <button type="button" onClick={() => setOpenKey(customer.key)} className="rounded-full border border-stone-200 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink hover:text-ink">History</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyAdminState icon={Users} title="No customers yet" copy="Customers appear here automatically when an order is placed from the storefront or created in the panel. Nothing is added by hand, so the list only ever holds people who actually ordered.">
            <div className="mt-6">
              <AdminGhostButton onClick={() => { setSearch(''); setSegment('all'); }}>Clear filters</AdminGhostButton>
            </div>
          </EmptyAdminState>
        )}

        <div className="space-y-6">
          <AdminSectionCard title="Value by city" description="Where the order value is coming from.">
            <AdminBarList items={byCity} formatValue={formatCurrency} />
          </AdminSectionCard>
          <AdminSectionCard title="How this list works" description="No separate customer master to maintain.">
            <ul className="space-y-2.5 text-xs leading-5 text-stone-500">
              <li>Customers are grouped by phone number first, then email address.</li>
              <li>Value counts every order except cancelled and refunded ones.</li>
              <li>Nobody is added by hand, so the list only ever holds real orders.</li>
            </ul>
          </AdminSectionCard>
        </div>
      </div>

      {openCustomer && <CustomerModal customer={openCustomer} orders={getCustomerOrders(orders, openCustomer.key)} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

function CustomerModal({ customer, orders, onClose }) {
  return (
    <Modal title={customer.name} description={`${customer.orders} orders · ${customer.units} units · ${formatCurrency(customer.revenue)} lifetime value`} onClose={onClose} wide>
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Contact" description="Taken from the most recent order.">
          <AdminDataList
            items={[
              { label: 'Phone', value: customer.mobile || 'Not recorded' },
              { label: 'Email', value: customer.email || 'Not recorded' },
              { label: 'Address', value: [customer.address, customer.city, customer.pin].filter(Boolean).join(', ') || 'Not recorded' },
              { label: 'Occasions', value: customer.occasions.join(', ') || 'None recorded' },
              { label: 'First order', value: formatDate(customer.firstOrderAt) },
              { label: 'Last order', value: formatDate(customer.lastOrderAt) },
              { label: 'Balance due', value: formatCurrency(customer.outstanding) },
            ]}
          />
        </AdminSectionCard>
        <AdminSectionCard title="Order history" description="Newest first.">
          <ul className="space-y-2.5">
            {orders.map((order) => (
              <li key={order.reference} className="rounded-xl border border-stone-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-ink">{order.reference} · {formatDate(order.createdAt)}</p>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={orderStatusTone[order.status]}>{order.status}</StatusPill>
                  </div>
                </div>
                <p className="mt-1 text-[0.65rem] text-stone-400">{orderUnitCount(order)} units · {order.channel}</p>
                <p className="mt-1 text-xs font-bold text-ink">{formatCurrency(order.totals.grandTotal)}{outstandingAmount(order) > 0 ? <span className="ml-2 text-rose-600">{formatCurrency(outstandingAmount(order))} due</span> : null}</p>
              </li>
            ))}
          </ul>
        </AdminSectionCard>
      </div>
    </Modal>
  );
}