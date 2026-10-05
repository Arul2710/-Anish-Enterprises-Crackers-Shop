import { Bell, Check, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { relativeTime } from '../services/notifications';
import { orderStatusTone, orderUnitCount, outstandingAmount } from '../services/orders';
import { formatCurrency, formatDateTime } from '../utils/format';
import { AdminFeedback, AdminGhostButton, AdminPageHeader, AdminSectionCard, AdminTabs, AdminTinyButton, ConfirmDialog, EmptyAdminState, PreviewNotice, StatusPill, useAdminFeedback } from './AdminUI';

/**
 * The full notification feed behind the header bell. Each row is a real order, read
 * straight from the order list, so this screen cannot report activity the shop did not
 * have. Confirming an order anywhere in the panel clears it here.
 */
export function AdminNotificationsPage() {
  const { notifications, orders, unreadCount, markRead, markAllRead, confirmOrder, busyReference } = useOrderNotifications();
  const [filter, setFilter] = useState('unread');
  const [confirmingReference, setConfirmingReference] = useState('');
  const feedback = useAdminFeedback();
  const navigate = useNavigate();

  const visible = useMemo(() => (filter === 'unread' ? notifications.filter((entry) => !entry.read) : notifications), [notifications, filter]);
  const confirmingEntry = notifications.find((entry) => entry.reference === confirmingReference) || null;

  const openOrder = (reference) => {
    markRead(reference);
    navigate(`/admin/orders?order=${encodeURIComponent(reference)}`);
  };

  const runConfirm = (reference) => {
    const result = confirmOrder(reference, 'Confirmed from the notifications screen');
    if (result.ok) {
      setConfirmingReference('');
      feedback.notify(result.message);
      return;
    }
    feedback.fail(result.error);
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Every item here is an order from the live order list, with the reference, customer, amount and time it was placed. Nothing is stored separately, so this screen can never show something the shop did not receive."
        action={
          unreadCount > 0 ? (
            <AdminGhostButton onClick={markAllRead}>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} /> Mark all read
              </span>
            </AdminGhostButton>
          ) : null
        }
      />

      <AdminFeedback error={feedback.error} success={feedback.success} />

      {!notifications.length && (
        <PreviewNotice tone="blue">
          Nothing to report yet. The moment a shopper sends an enquiry or an order is recorded, it appears here and raises an alert on the dashboard.
        </PreviewNotice>
      )}

      {notifications.length > 0 && (
        <AdminSectionCard
          title="Order notifications"
          description="Unread items are highlighted. Opening one takes you straight to that order."
          action={
            <AdminTabs
              tabs={[
                { value: 'unread', label: 'Unread', count: unreadCount },
                { value: 'all', label: 'All', count: notifications.length },
              ]}
              value={filter}
              onChange={setFilter}
            />
          }
        >
          {visible.length ? (
            <ul className="space-y-2.5">
              {visible.map((entry) => {
                const order = orders.find((record) => record.reference === entry.reference);
                const due = order ? outstandingAmount(order) : 0;
                return (
                  <li
                    key={entry.id}
                    className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition ${
                      entry.read ? 'border-stone-100 bg-white' : 'border-ember/40 bg-secondarySoft/60'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        entry.read ? 'bg-stone-100 text-stone-400' : 'bg-ember text-white'
                      }`}
                    >
                      <ShoppingBag size={16} strokeWidth={1.9} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-ink">{entry.reference}</span>
                        {!entry.read && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-white">
                            New
                          </span>
                        )}
                        <StatusPill tone={orderStatusTone[entry.status]}>{entry.status}</StatusPill>
                      </p>
                      <p className="mt-1.5 text-xs text-stone-500">
                        {entry.customerName} · <span className="font-bold text-ink">{formatCurrency(entry.amount)}</span> · {relativeTime(entry.createdAt)}
                      </p>
                      <p className="mt-0.5 text-[0.62rem] text-stone-400">
                        Placed {formatDateTime(entry.createdAt)}
                        {order ? ` · ${orderUnitCount(order)} units` : ''}
                        {due > 0 ? ` · ${formatCurrency(due)} due` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {entry.awaitingConfirmation && (
                        <AdminTinyButton
                          tone="ember"
                          disabled={Boolean(busyReference)}
                          onClick={() => {
                            feedback.clear();
                            setConfirmingReference(entry.reference);
                          }}
                        >
                          Confirm order
                        </AdminTinyButton>
                      )}
                      <AdminTinyButton onClick={() => openOrder(entry.reference)}>View order</AdminTinyButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl bg-stone-50 px-4 py-8 text-center text-xs text-stone-500">
              {filter === 'unread' ? 'Nothing unread. Every order notification has been read.' : 'No notifications to show.'}
            </p>
          )}
        </AdminSectionCard>
      )}

      {!notifications.length && (
        <EmptyAdminState icon={Bell} title="No notifications yet" copy="Order activity will collect here, newest first, as soon as the first order arrives." />
      )}

      {confirmingEntry && (
        <ConfirmDialog
          title={`Confirm ${confirmingEntry.reference}?`}
          description="This moves the order to Confirmed in the order list and clears its alert. It cannot be undone from this dialog."
          confirmLabel="Confirm order"
          busy={busyReference === confirmingEntry.reference}
          onConfirm={() => runConfirm(confirmingEntry.reference)}
          onClose={() => setConfirmingReference('')}
        >
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs">
            <p className="font-bold text-ink">{confirmingEntry.customerName}</p>
            <dl className="mt-3 space-y-2">
              <Line label="Order value" value={formatCurrency(confirmingEntry.amount)} />
              <Line label="Placed" value={formatDateTime(confirmingEntry.createdAt)} />
              <Line label="Current status" value={confirmingEntry.status} />
            </dl>
          </div>
        </ConfirmDialog>
      )}
    </div>
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
