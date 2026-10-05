import { Bell, Check, ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { relativeTime } from '../services/notifications';
import { orderStatusTone } from '../services/orders';
import { formatCurrency } from '../utils/format';
import { StatusPill } from './AdminUI';

/**
 * Header bell. The badge counts notifications nobody has read yet, and every row is a
 * real order, so the count always matches what the orders screen holds.
 */
export function AdminNotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useOrderNotifications();
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (container.current && !container.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openOrder = (reference) => {
    markRead(reference);
    setOpen(false);
    navigate(`/admin/orders?order=${encodeURIComponent(reference)}`);
  };

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition hover:text-goldInk"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-rose-600 px-1 text-[0.55rem] font-extrabold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <div>
              <p className="text-xs font-bold text-ink">Notifications</p>
              <p className="mt-0.5 text-[0.62rem] text-stone-400">
                {unreadCount ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-stone-500 transition hover:border-ink hover:text-ink"
              >
                <Check size={11} /> Mark read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {notifications.length ? (
              <ul className="divide-y divide-stone-100">
                {notifications.slice(0, 12).map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => openOrder(entry.reference)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-stone-50 ${entry.read ? '' : 'bg-secondarySoft/60'}`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          entry.read ? 'bg-stone-100 text-stone-400' : 'bg-ember text-white'
                        }`}
                      >
                        <ShoppingBag size={14} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-ink">{entry.reference}</span>
                          {!entry.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.65rem] text-stone-500">
                          {entry.customerName} · {formatCurrency(entry.amount)} · {relativeTime(entry.createdAt)}
                        </span>
                        <span className="mt-1.5 flex items-center gap-1.5">
                          <StatusPill tone={orderStatusTone[entry.status]}>{entry.status}</StatusPill>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-xs text-stone-400">No order activity yet.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/admin/notifications');
            }}
            className="w-full border-t border-stone-100 px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-goldInk transition hover:bg-stone-50"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
