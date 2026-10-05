import { ArrowRight, Bell, Check, IndianRupee, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { orderStatusTone, orderUnitCount, outstandingAmount } from '../services/orders';
import { relativeTime } from '../services/notifications';
import { formatCurrency, formatDateTime } from '../utils/format';
import { AdminFeedback, ConfirmDialog, StatusPill, useAdminFeedback } from './AdminUI';

/**
 * The alert a shopper's order raises. It is driven by the arrival list, so it appears
 * the moment a real order lands and disappears on its own once that order is confirmed,
 * cancelled or removed - the same order drives the card, the badge and the order list.
 */
export function NewOrderAlert() {
  const { arrivals, busyReference, confirmOrder, dismissArrival } = useOrderNotifications();
  const [confirmingReference, setConfirmingReference] = useState('');
  const feedback = useAdminFeedback();
  const navigate = useNavigate();

  if (!arrivals.length) return null;

  const confirmingOrder = arrivals.find((order) => order.reference === confirmingReference) || null;
  const busy = Boolean(busyReference);

  const runConfirm = () => {
    const reference = confirmingReference;
    if (!reference) return;
    const result = confirmOrder(reference, 'Confirmed from the new order alert');
    if (result.ok) {
      setConfirmingReference('');
      feedback.notify(result.message);
      return;
    }
    feedback.fail(result.error);
  };

  return (
    <>
      <div className="space-y-3">
        {arrivals.slice(0, 3).map((order) => {
          const due = outstandingAmount(order);
          return (
            <article
              key={order.reference}
              className="rounded-2xl border-2 border-ember/40 bg-gradient-to-r from-secondarySoft via-white to-white p-4 shadow-[0_12px_35px_rgba(212,175,55,0.12)] sm:p-5"
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember text-white">
                  <Bell size={17} strokeWidth={1.9} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ember px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white">
                      <Sparkles size={10} /> New order
                    </span>
                    <span className="text-sm font-bold text-ink">{order.reference}</span>
                    <StatusPill tone={orderStatusTone[order.status]}>{order.status}</StatusPill>
                  </p>

                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                    <span className="inline-flex items-center gap-1.5">
                      <User size={12} className="text-stone-400" />
                      {order.customer?.name || 'Not recorded'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                      <IndianRupee size={12} className="text-goldInk" />
                      {formatCurrency(order.totals.grandTotal)}
                    </span>
                    <span className="text-stone-400">
                      {orderUnitCount(order)} units · {relativeTime(order.createdAt)} · {formatDateTime(order.createdAt)}
                    </span>
                  </p>

                  {due > 0 && <p className="mt-1.5 text-[0.65rem] font-bold text-rose-600">{formatCurrency(due)} still due on this order.</p>}
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      feedback.clear();
                      setConfirmingReference(order.reference);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ember px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emberDark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check size={13} /> Confirm order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      feedback.clear();
                      navigate(`/admin/orders?order=${encodeURIComponent(order.reference)}`);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink hover:text-ink"
                  >
                    View order <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissArrival(order.reference)}
                    className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-stone-400 transition hover:text-stone-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {arrivals.length > 3 && (
          <p className="px-1 text-[0.65rem] text-stone-400">
            {arrivals.length - 3} more new order{arrivals.length - 3 === 1 ? '' : 's'} waiting. Open the notifications screen to work through them.
          </p>
        )}

        <AdminFeedback error={feedback.error} success={feedback.success} />
      </div>

      {confirmingOrder && (
        <ConfirmDialog
          title={`Confirm ${confirmingOrder.reference}?`}
          description="This moves the order to Confirmed in the order list and clears its new order alert. It cannot be undone from this dialog."
          confirmLabel="Confirm order"
          busy={inFlightBusy(busyReference, confirmingOrder.reference)}
          onConfirm={runConfirm}
          onClose={() => setConfirmingReference('')}
        >
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs">
            <p className="font-bold text-ink">{confirmingOrder.customer?.name || 'Not recorded'}</p>
            <dl className="mt-3 space-y-2">
              <Row label="Order value" value={formatCurrency(confirmingOrder.totals.grandTotal)} />
              <Row label="Units" value={String(orderUnitCount(confirmingOrder))} />
              <Row label="Placed" value={formatDateTime(confirmingOrder.createdAt)} />
              <Row label="Current status" value={confirmingOrder.status} />
            </dl>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}

/** The dialog button only spins for its own order, so a second card stays clickable. */
const inFlightBusy = (busyReference, reference) => Boolean(busyReference) && busyReference === reference;

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-bold text-ink">{value}</dd>
    </div>
  );
}
