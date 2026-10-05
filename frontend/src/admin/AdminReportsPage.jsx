import { BarChart3, Download, FileSpreadsheet, FileText, IndianRupee, Printer, ShoppingBag, TrendingUp, Truck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useContent } from '../hooks/useContent';
import { useCatalog } from '../hooks/useCatalog';
import { useOrders } from '../hooks/useOrders';
import { dateRange, filterOrders, getReportSummary, getSalesByDay, listCustomers, orderUnitCount } from '../services/orders';
import { downloadReportCsv, downloadReportExcel, downloadReportWord, printReportDocument } from '../utils/documents';
import { formatCurrency, formatDate } from '../utils/format';
import {
  AdminBarList,
  AdminDataList,
  AdminFeedback,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminSectionCard,
  AdminSparkline,
  AdminStatCard,
  AdminTableNote,
  AdminTabs,
  AdminTinyButton,
  PreviewNotice,
  StatusPill,
  useAdminFeedback,
} from './AdminUI';

const presets = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

const rangeLabel = (preset, from, to) => {
  if (preset === 'all') return 'All orders to date';
  const start = from ? formatDate(from) : 'Any';
  return `${start} to ${to ? formatDate(to) : formatDate(new Date())}`;
};

export function AdminReportsPage() {
  const { siteContent } = useContent();
  const { catalog } = useCatalog();
  const feedback = useAdminFeedback();
  const [orders] = useOrders();
  const [preset, setPreset] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const range = useMemo(() => {
    // The preset sets the window; typing a date overrides the matching end of it.
    const presetRange = dateRange(preset);
    const start = from ? new Date(`${from}T00:00:00`) : presetRange.from;
    const end = to ? new Date(`${to}T23:59:59`) : presetRange.to;
    return { preset, from: start, to: end };
  }, [preset, from, to]);

  const scoped = useMemo(() => filterOrders(orders, { from: range.from, to: range.to }), [orders, range]);
  const summary = useMemo(() => getReportSummary(scoped), [scoped]);
  const salesByDay = useMemo(() => getSalesByDay(scoped, 30), [scoped]);
  const customers = useMemo(() => listCustomers(scoped), [scoped]);
  const contact = siteContent.contact || {};

  const stats = [
    { label: 'Orders', value: String(summary.total) },
    { label: 'Order value', value: formatCurrency(summary.revenue) },
    { label: 'Average order', value: formatCurrency(summary.average) },
    { label: 'Units sold', value: String(summary.units) },
    { label: 'Customers', value: String(summary.customers) },
    { label: 'Balance due', value: formatCurrency(summary.outstanding) },
  ];

  const report = {
    title: 'Sales report',
    fileLabel: `sales-report-${preset}`,
    subtitle: `${rangeLabel(preset, range.from, range.to)} · ${scoped.length} orders`,
    stats,
    business: {
      businessName: contact.businessName || 'Anish Enterprises',
      address: [contact.address, contact.city, contact.state].filter(Boolean).join(', '),
      phone: contact.phone,
      email: contact.email,
    },
    sections: [
      {
        heading: 'Daily sales',
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'orders', label: 'Orders', align: 'right' },
          { key: 'units', label: 'Units', align: 'right' },
          { key: 'revenue', label: 'Value', align: 'right' },
        ],
        rows: salesByDay.map((day) => ({ date: formatDate(day.date), orders: day.orders, units: day.units, revenue: day.revenue })),
        totals: ['Total', salesByDay.reduce((sum, day) => sum + day.orders, 0), salesByDay.reduce((sum, day) => sum + day.units, 0), salesByDay.reduce((sum, day) => sum + day.revenue, 0)],
      },
      {
        heading: 'Sales by category',
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'lines', label: 'Lines', align: 'right' },
          { key: 'units', label: 'Units', align: 'right' },
          { key: 'revenue', label: 'Value', align: 'right' },
        ],
        rows: summary.salesByCategory,
        totals: ['Total', summary.salesByCategory.reduce((sum, row) => sum + row.lines, 0), summary.salesByCategory.reduce((sum, row) => sum + row.units, 0), summary.revenue],
      },
      {
        heading: 'Best selling items',
        columns: [
          { key: 'name', label: 'Item' },
          { key: 'category', label: 'Category' },
          { key: 'units', label: 'Units', align: 'right' },
          { key: 'revenue', label: 'Value', align: 'right' },
        ],
        rows: summary.topProducts,
        totals: ['Total', '', summary.topProducts.reduce((sum, row) => sum + row.units, 0), summary.topProducts.reduce((sum, row) => sum + row.revenue, 0)],
      },
      {
        heading: 'Order status',
        columns: [
          { key: 'status', label: 'Status' },
          { key: 'count', label: 'Orders', align: 'right' },
          { key: 'value', label: 'Value', align: 'right' },
        ],
        rows: summary.statuses,
        totals: ['Total', summary.total, summary.statuses.reduce((sum, row) => sum + row.value, 0)],
      },
      {
        heading: 'Payment status',
        columns: [
          { key: 'status', label: 'Payment' },
          { key: 'count', label: 'Orders', align: 'right' },
          { key: 'value', label: 'Value', align: 'right' },
        ],
        rows: summary.payments,
        totals: ['Total', summary.total, summary.payments.reduce((sum, row) => sum + row.value, 0)],
      },
      {
        heading: 'Customers in this range',
        columns: [
          { key: 'name', label: 'Customer' },
          { key: 'mobile', label: 'Phone' },
          { key: 'city', label: 'City' },
          { key: 'orders', label: 'Orders', align: 'right' },
          { key: 'revenue', label: 'Value', align: 'right' },
        ],
        rows: customers.map((customer) => ({ name: customer.name, mobile: customer.mobile, city: customer.city, orders: customer.orders, revenue: customer.revenue })),
        totals: ['Total', '', '', customers.reduce((sum, row) => sum + row.orders, 0), customers.reduce((sum, row) => sum + row.revenue, 0)],
      },
    ],
    note: 'Cancelled and refunded orders are excluded from value totals but shown in the status tables.',
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Insight"
        title="Reports"
        description="Sales, category and customer reporting calculated from your order records for any date range. Every figure can be printed, saved as Word, or opened as a spreadsheet."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminTinyButton onClick={() => printReportDocument(report)}><Printer size={13} /> Print</AdminTinyButton>
            <AdminTinyButton onClick={() => downloadReportWord(report)}><FileText size={13} /> Word</AdminTinyButton>
            <AdminTinyButton onClick={() => downloadReportCsv(report)}><Download size={13} /> CSV</AdminTinyButton>
            <AdminTinyButton tone="ember" onClick={() => downloadReportExcel(report)}><FileSpreadsheet size={13} /> Excel</AdminTinyButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-end">
        <AdminTabs tabs={presets.map((option) => ({ value: option.value, label: option.label }))} value={preset} onChange={(value) => { setPreset(value); setFrom(''); setTo(''); }} />
        <AdminField label="From" className="lg:w-44">
          <AdminInput type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
        </AdminField>
        <AdminField label="To" className="lg:w-44">
          <AdminInput type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
        </AdminField>
        <p className="pb-2.5 text-xs text-stone-500">{rangeLabel(preset, range.from, range.to)}</p>
      </div>

      <AdminFeedback error={feedback.error} success={feedback.success} />

      {!orders.length && (
        <PreviewNotice tone="blue">
          There are no orders to report on yet. Place an order from the storefront, or create one on the Orders screen, and every chart and table on this page fills in automatically.
        </PreviewNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Orders in range" value={summary.total} note={`${summary.units} units`} icon={ShoppingBag} />
        <AdminStatCard label="Order value" value={formatCurrency(summary.revenue)} note={`Average ${formatCurrency(summary.average)}`} icon={IndianRupee} tone="green" />
        <AdminStatCard label="Customers" value={summary.customers} note={`${summary.byStatus.Delivered} delivered orders`} icon={Users} tone="blue" />
        <AdminStatCard label="Balance due" value={formatCurrency(summary.outstanding)} note="Unpaid and part-paid" icon={Truck} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="Daily sales" description="Value per day across the selected range.">
          {salesByDay.some((day) => day.revenue > 0) ? (
            <>
              <AdminSparkline points={salesByDay.map((day) => day.revenue)} />
              <div className="mt-4">
                <AdminBarList items={salesByDay.slice(-10).map((day) => ({ label: formatDate(day.date), value: day.revenue, note: `${day.orders} orders` }))} formatValue={formatCurrency} />
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-xs text-stone-400">No sales recorded in this range.</p>
          )}
        </AdminSectionCard>

        <AdminSectionCard title="Sales by category" description="Which parts of the catalog are carrying the value.">
          <AdminBarList items={summary.salesByCategory.map((row) => ({ label: row.category, value: row.revenue, note: `${row.units} units` }))} formatValue={formatCurrency} />
        </AdminSectionCard>

        <AdminSectionCard title="Best selling items" description="Ranked by units sold in this range.">
          {summary.topProducts.length ? (
            <ul className="divide-y divide-line">
              {summary.topProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink">{product.name}</p>
                    <p className="text-[0.65rem] text-stone-400">{product.category}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-ink">{formatCurrency(product.revenue)}</p>
                    <p className="text-[0.65rem] text-stone-400">{product.units} units</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-stone-400">No items sold in this range.</p>
          )}
        </AdminSectionCard>

        <AdminSectionCard title="Order and payment mix" description="Where every order currently stands.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-stone-400">Status</p>
              <ul className="space-y-2">
                {summary.statuses.map((row) => (
                  <li key={row.status} className="flex items-center justify-between gap-3 text-xs">
                    <StatusPill tone={row.tone}>{row.status}</StatusPill>
                    <span className="text-stone-500">{row.count} · {formatCurrency(row.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-stone-400">Payment</p>
              <ul className="space-y-2">
                {summary.payments.map((row) => (
                  <li key={row.status} className="flex items-center justify-between gap-3 text-xs">
                    <StatusPill tone={row.tone}>{row.status}</StatusPill>
                    <span className="text-stone-500">{row.count} · {formatCurrency(row.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <AdminSectionCard title="Orders in this range" description="The exact rows behind every number above.">
          {scoped.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="text-right">Units</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {scoped.slice(0, 25).map((order) => (
                    <tr key={order.reference}>
                      <td className="font-bold text-ink">{order.reference}</td>
                      <td className="whitespace-nowrap">{formatDate(order.createdAt)}</td>
                      <td>{order.customer?.name || 'Not recorded'}</td>
                      <td>{order.status}</td>
                      <td className="text-right">{orderUnitCount(order)}</td>
                      <td className="text-right font-bold text-ink">{formatCurrency(order.totals.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-stone-400">No orders in this range.</p>
          )}
          {scoped.length > 25 && <AdminTableNote>Showing the 25 newest of {scoped.length} orders. Export the report for the full list.</AdminTableNote>}
        </AdminSectionCard>

        <div className="space-y-6">
          <AdminSectionCard title="Summary" description="Headline numbers for the selected range.">
            <AdminDataList items={stats.map((stat) => ({ label: stat.label, value: stat.value }))} />
          </AdminSectionCard>
          <AdminSectionCard title="Largest order" description="Single biggest order in this range.">
            {summary.bestOrder ? (
              <AdminDataList
                items={[
                  { label: 'Reference', value: summary.bestOrder.reference },
                  { label: 'Customer', value: summary.bestOrder.customer?.name || 'Not recorded' },
                  { label: 'Date', value: formatDate(summary.bestOrder.createdAt) },
                  { label: 'Units', value: String(orderUnitCount(summary.bestOrder)) },
                  { label: 'Value', value: formatCurrency(summary.bestOrder.totals.grandTotal) },
                ]}
              />
            ) : (
              <p className="py-4 text-center text-xs text-stone-400">No orders in this range.</p>
            )}
          </AdminSectionCard>
          <AdminSectionCard title="Catalog coverage" description="How much of the catalog sold in this range.">
            <AdminDataList
              items={[
                { label: 'Products in catalog', value: String(catalog.catalogProducts.length) },
                { label: 'Categories', value: String(catalog.catalogCategories.length) },
                { label: 'Items sold', value: String(summary.topProducts.length) },
                { label: 'Units sold', value: String(summary.units) },
              ]}
            />
          </AdminSectionCard>
        </div>
      </div>

      <div className="rounded-2xl border border-tintEdge bg-white p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-400"><BarChart3 size={14} /> How these numbers are built</p>
        <ul className="mt-3 space-y-1.5 text-xs leading-5 text-stone-500">
          <li>Value counts every order except cancelled and refunded ones.</li>
          <li>Average order value is total value divided by the number of counted orders.</li>
          <li>Balance due is the part of each counted order that has not been received.</li>
          <li>Date filters use the day the order was placed.</li>
        </ul>
        <p className="mt-3 flex items-center gap-2 text-xs text-stone-400"><TrendingUp size={14} /> Exports contain exactly the rows shown here.</p>
      </div>
    </div>
  );
}
