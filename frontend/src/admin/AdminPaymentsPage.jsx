import { Banknote, IndianRupee, ReceiptIndianRupee, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  getPaymentBreakdown,
  getOrderStats,
  isRevenueOrder,
  orderUnitCount,
  outstandingAmount,
  paymentStatuses,
  paymentStatusTone,
  updateOrderPayment,
} from '../services/orders';
import { useOrders } from '../hooks/useOrders';
import { formatCurrency, formatDate } from '../utils/format';
import {
  AdminBarList,
  AdminFeedback,
  AdminGhostButton,
  AdminInput,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  AdminTableNote,
  AdminTabs,
  AdminTinyButton,
  AdminField,
  EmptyAdminState,
  Modal,
  PreviewNotice,
  StatusPill,
  useAdminFeedback,
} from './AdminUI';

/**
 * Money collected and money owed. Every figure is summed from the live order records by
 * the same helpers the reports screen uses, and recording a payment writes through
 * updateOrderPayment, so the balance here and on the dashboard cannot disagree.
 */
export function AdminPaymentsPage() {
  const [orders] = useOrders();
  const [filter, setFilter] = useState('all');
  const [paying, setPaying] = useState(null);
  const feedback = useAdminFeedback();

  const stats = useMemo(() => getOrderStats(orders), [orders]);
  const breakdown = useMemo(() => getPaymentBreakdown(orders), [orders]);

  const collected = useMemo(
    () => orders.filter(isRevenueOrder).reduce((sum, order) => sum + (Number(order.paidAmount) || 0), 0),
    [orders],
  );
  const refunded = useMemo(
    () => orders.filter((order) => order.paymentStatus === 'Refunded').reduce((sum, order) => sum + order.totals.grandTotal, 0),
    [orders],
  );

  const visible = useMemo(() => (filter === 'all' ? orders : orders.filter((order) => order.paymentStatus === filter)), [orders, filter]);
  const sorted = useMemo(() => [...visible].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [visible]);

  const recordPayment = (reference, paidAmount) => {
    const result = updateOrderPayment(reference, { paidAmount });
    setPaying(null);
    if (!result) {
      feedback.fail('That order is not on record.');
      return;
    }
    const due = outstandingAmount(result);
    feedback.notify(
      due > 0
        ? `${reference} updated. ${formatCurrency(due)} is still outstanding.`
        : `${reference} is fully paid.`,
    );
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Money"
        title="Payments"
        description="What has been collected, what is still owed, and how each order was paid. Figures are summed from the same order records the Orders screen shows."
        action={<AdminGhostButton onClick={() => setFilter('all')}>Show every order</AdminGhostButton>}
      />

      <AdminFeedback error={feedback.error} success={feedback.success} />

      {!orders.length && (
        <PreviewNotice tone="blue">
          There are no orders yet, so there is nothing to collect. Payments appear here as soon as a shopper sends an enquiry or you record an order yourself.
        </PreviewNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Collected" value={formatCurrency(collected)} note="Received against live orders" icon={Wallet} tone="green" />
        <AdminStatCard label="Outstanding" value={formatCurrency(stats.outstanding)} note="Unpaid and part-paid" icon={IndianRupee} tone="amber" />
        <AdminStatCard label="Refunded" value={formatCurrency(refunded)} note="Returned to the customer" icon={ReceiptIndianRupee} tone="red" />
        <AdminStatCard label="Order value" value={formatCurrency(stats.revenue)} note="Excludes cancelled and refunded" icon={Banknote} />
      </div>

      <AdminSectionCard
        title="Payment breakdown"
        description="How the live order book splits across the payment statuses."
      >
        <AdminBarList
          items={breakdown.map((row) => ({ label: row.status, value: row.value, note: `${row.count} order${row.count === 1 ? '' : 's'}` }))}
          formatValue={formatCurrency}
        />
        <AdminTableNote>Counts and values come from getPaymentBreakdown over the current order list.</AdminTableNote>
      </AdminSectionCard>

      {orders.length ? (
        <AdminSectionCard
          title="Payments by order"
          description="Record what has actually been received against an order. The status follows the amount you enter."
          action={
            <AdminTabs
              tabs={[{ value: 'all', label: 'All' }, ...paymentStatuses.map((status) => ({ value: status, label: status, count: stats.byPayment[status] }))]}
              value={filter}
              onChange={setFilter}
            />
          }
        >
          <div className="admin-table-wrap rounded-none border-0">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Received</th>
                  <th className="text-right">Due</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((order) => {
                  const due = outstandingAmount(order);
                  return (
                    <tr key={order.reference}>
                      <td>
                        <span className="text-xs font-bold text-ink">{order.reference}</span>
                        <span className="mt-0.5 block text-[0.62rem] text-stone-400">{orderUnitCount(order)} units</span>
                      </td>
                      <td className="text-xs">{order.customer?.name || 'Not recorded'}</td>
                      <td className="whitespace-nowrap text-xs text-stone-500">{formatDate(order.createdAt)}</td>
                      <td className="whitespace-nowrap text-right text-xs font-bold text-ink">{formatCurrency(order.totals.grandTotal)}</td>
                      <td className="whitespace-nowrap text-right text-xs text-stone-600">{formatCurrency(order.paidAmount)}</td>
                      <td className={`whitespace-nowrap text-right text-xs font-bold ${due > 0 ? 'text-rose-600' : 'text-stone-400'}`}>
                        {formatCurrency(due)}
                      </td>
                      <td>
                        <StatusPill tone={paymentStatusTone[order.paymentStatus]}>{order.paymentStatus}</StatusPill>
                      </td>
                      <td className="text-right">
                        <AdminTinyButton tone="ember" onClick={() => setPaying(order)}>
                          Record payment
                        </AdminTinyButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!sorted.length && <p className="py-6 text-center text-xs text-stone-400">No orders with that payment status.</p>}
        </AdminSectionCard>
      ) : (
        <EmptyAdminState icon={Wallet} title="No payments to show" copy="Once an order exists, what it owes and what it has paid appears here." />
      )}

      {paying && (
        <RecordPaymentModal
          order={paying}
          onClose={() => setPaying(null)}
          onSave={(amount) => recordPayment(paying.reference, amount)}
        />
      )}
    </div>
  );
}

function RecordPaymentModal({ order, onClose, onSave }) {
  const due = outstandingAmount(order);
  const [amount, setAmount] = useState(String(due > 0 ? due : Number(order.paidAmount) || 0));
  const [error, setError] = useState('');

  const save = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      setError('Enter an amount of zero or more.');
      return;
    }
    if (value > order.totals.grandTotal) {
      setError('That is more than the order total.');
      return;
    }
    onSave(value);
  };

  return (
    <Modal
      title={`Record a payment for ${order.reference}`}
      description="The payment status is worked out from the amount you enter, so it cannot claim more than has been received."
      onClose={onClose}
    >
      <div className="space-y-5">
        <dl className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 text-xs">
          <Line label="Customer" value={order.customer?.name || 'Not recorded'} />
          <Line label="Order total" value={formatCurrency(order.totals.grandTotal)} />
          <Line label="Already received" value={formatCurrency(order.paidAmount)} />
          <Line label="Currently due" value={formatCurrency(due)} />
        </dl>

        <AdminField label="Amount received" required error={error} hint="Enter the full balance to settle the order, or a part payment to leave a balance.">
          <AdminInput type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </AdminField>

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <AdminGhostButton onClick={onClose}>Cancel</AdminGhostButton>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-ember px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emberDark"
          >
            Save payment
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-bold text-ink">{value}</dd>
    </div>
  );
}
