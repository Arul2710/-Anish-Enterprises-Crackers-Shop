import { AlertTriangle, ArrowRight, Banknote, Boxes, Gift, IndianRupee, Package, Phone, ShoppingBag, TrendingUp, Truck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useCatalog } from '../hooks/useCatalog';
import { useContent } from '../hooks/useContent';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useOrders } from '../hooks/useOrders';
import { getOrderStats, getSalesByDay, listCustomers, orderStatusTone, orderUnitCount, outstandingAmount, paymentStatusTone, updateOrderStatus } from '../services/orders';
import { formatCurrency, formatDate } from '../utils/format';
import { NewOrderAlert } from './NewOrderAlert';
import { AdminBarList, AdminPageHeader, AdminProgressRing, AdminSectionCard, AdminSparkline, AdminStatCard, AdminTabs, AdminTinyButton, PreviewNotice, StatusPill } from './AdminUI';

const quickStats = [
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Boxes },
  { to: '/admin/combo-packs', label: 'Combo packs', icon: Gift },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: TrendingUp },
  { to: '/admin/contact', label: 'Contact', icon: Phone },
];

export function AdminDashboardPage() {
  const { user } = useAdminAuth();
  const { siteContent } = useContent();
  const { catalog, products, categories, packs } = useCatalog();
  const [orders] = useOrders();
  const { unread } = useOrderNotifications();
  const [range, setRange] = useState('7d');

  const unreadReferences = useMemo(() => new Set(unread.map((entry) => entry.reference)), [unread]);

  const stats = useMemo(() => getOrderStats(orders), [orders]);
  const recent = useMemo(() => orders.slice(0, 8), [orders]);
  const actionQueue = useMemo(() => orders.filter((order) => ['Pending', 'Confirmed'].includes(order.status)), [orders]);
  const customers = useMemo(() => listCustomers(orders), [orders]);
  const salesByDay = useMemo(() => getSalesByDay(orders, 14), [orders]);
  const rangeOrders = useMemo(() => {
    if (range === 'all') return orders;
    const days = Number(range.replace('d', ''));
    const from = Date.now() - days * 86400000;
    return orders.filter((order) => new Date(order.createdAt).getTime() >= from);
  }, [orders, range]);
  const rangeStats = useMemo(() => getOrderStats(rangeOrders), [rangeOrders]);

  const inPipeline = actionQueue.reduce((sum, order) => sum + order.totals.grandTotal, 0);
  const activeProducts = products.filter((product) => product.status === 'active');
  const outOfStock = activeProducts.filter((product) => product.stock === 0);
  const untracked = activeProducts.filter((product) => product.stock === null);
  const contact = siteContent.contact || {};
  const contactComplete = [contact.phone, contact.email, contact.address, contact.city].every((value) => String(value || '').trim());

  const advance = (order) => {
    const flow = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
    const next = flow[flow.indexOf(order.status) + 1] || 'Delivered';
    updateOrderStatus(order.reference, next, 'Moved from the dashboard queue');
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Overview"
        title={user ? `Welcome back, ${String(user.name).split(' ')[0]}.` : 'Dashboard'}
        description="Everything on this page is calculated from live records: orders, products, packs and customers. Empty numbers mean no records yet, not placeholder data."
        action={<Link to="/admin/orders" className="btn-primary"><ShoppingBag size={15} /> Manage orders</Link>}
      />

      <NewOrderAlert />

      {!orders.length && (
        <PreviewNotice tone="blue">
          There are no orders yet. They appear here as soon as a shopper sends an enquiry from the storefront, or as soon as you create one from the Orders screen. Catalogue figures below come from the supplied price sheet.
        </PreviewNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Orders" value={stats.total} note={`${stats.units} units · ${stats.customers} customers`} icon={ShoppingBag} to="/admin/orders" />
        <AdminStatCard label="Order value" value={formatCurrency(stats.revenue)} note="Excludes cancelled and refunded" icon={IndianRupee} tone="green" to="/admin/reports" />
        <AdminStatCard label="Balance due" value={formatCurrency(stats.outstanding)} note="Unpaid and part-paid" icon={Banknote} tone="amber" to="/admin/orders" />
        <AdminStatCard label="In progress" value={actionQueue.length} note={actionQueue.length ? `${formatCurrency(inPipeline)} to fulfil` : 'Nothing in the pipeline'} icon={Truck} tone="blue" to="/admin/orders" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <AdminSectionCard
            title="Recent orders"
            description="The last eight orders placed, newest first."
            action={<Link to="/admin/orders" className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-goldInk">View all</Link>}
          >
            {recent.length ? (
              <ul className="divide-y divide-line">
                {recent.map((order) => {
                  const isNew = unreadReferences.has(order.reference);
                  return (
                    <li key={order.reference} className={`flex flex-wrap items-center gap-3 py-3 ${isNew ? 'relative' : ''}`}>
                      {isNew ? <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-ember" /> : null}
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${isNew ? 'border-ember/40 bg-secondarySoft text-goldInk' : 'border-marigold/30 bg-secondarySoft text-goldInk'}`}>
                        <ShoppingBag size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink">
                          {order.reference}
                          {isNew ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-white">
                              New
                            </span>
                          ) : null}
                          <StatusPill tone={orderStatusTone[order.status]}>{order.status}</StatusPill>
                          <StatusPill tone={paymentStatusTone[order.paymentStatus]}>{order.paymentStatus}</StatusPill>
                        </p>
                        <p className="mt-1 truncate text-[0.68rem] text-stone-500">
                          {order.customer?.name || 'Not recorded'} · {orderUnitCount(order)} units · {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-ink">{formatCurrency(order.totals.grandTotal)}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-xs text-stone-500">No orders yet.</p>
            )}
          </AdminSectionCard>

          <AdminSectionCard
            title="Needs action"
            description="Pending and confirmed orders, in the order they were placed."
            action={<span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-stone-400">{actionQueue.length} in queue</span>}
          >
            {actionQueue.length ? (
              <ul className="space-y-2.5">
                {actionQueue.slice(0, 6).map((order) => (
                  <li key={order.reference} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-100 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink">{order.reference} · {order.customer?.name || 'Not recorded'}</p>
                      <p className="mt-0.5 text-[0.65rem] text-stone-400">
                        {order.status} · {formatCurrency(order.totals.grandTotal)}
                        {outstandingAmount(order) > 0 ? ` · ${formatCurrency(outstandingAmount(order))} due` : ''}
                      </p>
                    </div>
                    <AdminTinyButton tone="ember" onClick={() => advance(order)}>
                      <span className="inline-flex items-center gap-1.5">Move on <ArrowRight size={12} /></span>
                    </AdminTinyButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-xs text-stone-500">Nothing waiting. Every order has moved past confirmation.</p>
            )}
          </AdminSectionCard>
        </div>

        <div className="space-y-6">
          <AdminSectionCard
            title="Sales trend"
            description="Order value per day for the last fortnight."
            action={
              <AdminTabs
                tabs={[{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: 'all', label: 'All' }]}
                value={range}
                onChange={setRange}
              />
            }
          >
            <div className="flex items-center gap-5">
              <AdminProgressRing value={rangeStats.revenue} max={Math.max(rangeStats.revenue, salesByDay.reduce((max, day) => Math.max(max, day.revenue), 0), 1)} label={formatCurrency(rangeStats.revenue)} size={92} />
              <div className="min-w-0 flex-1">
                <AdminSparkline points={salesByDay.map((day) => day.revenue)} />
                <p className="mt-2 text-[0.65rem] text-stone-400">{rangeStats.total} orders in this range · average {formatCurrency(rangeStats.average)}</p>
              </div>
            </div>
            <div className="mt-5">
              <AdminBarList
                items={salesByDay.slice(-7).map((day) => ({ label: formatDate(day.date), value: day.revenue, note: `${day.orders} orders` }))}
                formatValue={formatCurrency}
              />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Catalogue" description="Live catalog records the storefront renders." action={<Link to="/admin/products" className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-goldInk">Manage</Link>}>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center justify-between"><span className="text-stone-500">Products</span><span className="font-bold text-ink">{catalog.catalogProducts.length}</span></li>
              <li className="flex items-center justify-between"><span className="text-stone-500">Active</span><span className="font-bold text-ink">{activeProducts.length}</span></li>
              <li className="flex items-center justify-between"><span className="text-stone-500">Categories</span><span className="font-bold text-ink">{categories.length}</span></li>
              <li className="flex items-center justify-between"><span className="text-stone-500">Combo &amp; gift packs</span><span className="font-bold text-ink">{packs.length}</span></li>
              <li className="flex items-center justify-between"><span className="text-stone-500">Stock not tracked</span><span className="font-bold text-stone-500">{untracked.length}</span></li>
              <li className="flex items-center justify-between">
                <span className="text-stone-500">Out of stock</span>
                <span className={`font-bold ${outOfStock.length ? 'text-rose-600' : 'text-ink'}`}>{outOfStock.length}</span>
              </li>
            </ul>
            {outOfStock.length > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[0.68rem] text-rose-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {outOfStock.slice(0, 3).map((product) => product.name).join(', ')}{outOfStock.length > 3 ? ` and ${outOfStock.length - 3} more` : ''} are set to zero stock.
              </p>
            )}
          </AdminSectionCard>

          <AdminSectionCard title="Customers" description="Built from the orders people have actually placed." action={<Link to="/admin/customers" className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-goldInk">View all</Link>}>
            {customers.length ? (
              <ul className="space-y-2.5">
                {customers.slice(0, 5).map((customer) => (
                  <li key={customer.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink">{customer.name}</p>
                      <p className="truncate text-[0.65rem] text-stone-400">{[customer.mobile, customer.city].filter(Boolean).join(' · ') || 'No contact details'}</p>
                    </div>
                    <p className="shrink-0 text-xs font-bold text-ink">{formatCurrency(customer.revenue)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-xs text-stone-500">No customers yet.</p>
            )}
          </AdminSectionCard>

          <AdminSectionCard title="Quick actions" description="Jump straight to the screen you need.">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {quickStats.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="flex flex-col gap-2 rounded-xl border border-stone-200 px-3.5 py-3 text-xs font-bold text-stone-600 transition hover:border-ember hover:text-goldInk">
                  <Icon size={16} strokeWidth={1.7} />
                  {label}
                </Link>
              ))}
            </div>
          </AdminSectionCard>

          {!contactComplete && (
            <AdminSectionCard title="Finish your contact details" description="Orders print your business details, and the storefront shows them on the contact page.">
              <Link to="/admin/contact" className="btn-primary">Complete contact details</Link>
            </AdminSectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
