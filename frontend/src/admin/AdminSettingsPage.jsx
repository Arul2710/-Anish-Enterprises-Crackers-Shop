import { KeyRound, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { roleLabels, SESSION_DURATION_MS } from '../services/auth';
import { useOrders } from '../hooks/useOrders';
import { clearStorage, readStorage } from '../utils/storage';
import { formatDateTime } from '../utils/format';
import {
  AdminDataList,
  AdminGhostButton,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  AdminTabs,
  ConfirmDialog,
} from './AdminUI';

const storageSummary = [
  ['Products', 'spark-shine-products'],
  ['Categories', 'spark-shine-categories'],
  ['Combo and gift packs', 'spark-shine-packs'],
  ['Orders', 'spark-shine-orders'],
  ['Enquiries', 'spark-shine-enquiries'],
  ['Site content', 'spark-shine-site-content'],
  ['FAQ entries', 'spark-shine-faqs'],
  ['Reviews', 'spark-shine-testimonials'],
];

const stored = (key) => {
  const value = readStorage(key, null);
  if (Array.isArray(value)) return `${value.length} record${value.length === 1 ? '' : 's'}`;
  if (value && typeof value === 'object') return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? '' : 's'}`;
  return value ? 'Stored' : 'Using defaults';
};

export function AdminSettingsPage() {
  const { user, signOut } = useAdminAuth();
  const [tab, setTab] = useState('account');
  const [orders] = useOrders();

  if (!user) return null;

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Panel"
        title="Settings"
        description="Your sign-in details, session status, and a summary of what is stored in this browser."
      />

      <AdminTabs
        tabs={[
          { value: 'account', label: 'My account' },
          { value: 'data', label: 'Stored data' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'account' && <AccountTab user={user} onSignOut={signOut} />}

      {tab === 'data' && <DataTab orders={orders} onSignOut={signOut} />}
    </div>
  );
}

function AccountTab({ user, onSignOut }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <AdminSectionCard title="Your details" description="The account that is signed in to this panel.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-stone-400">Full name</p>
              <p className="mt-1 text-sm font-semibold text-ink">{user.name}</p>
            </div>
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-stone-400">Phone</p>
              <p className="mt-1 text-sm font-semibold text-ink">{user.phone || '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-stone-400">Email address</p>
              <p className="mt-1 break-all text-sm font-semibold text-ink">{user.email}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-stone-400">
            Signed in as {roleLabels[user.role] || user.role}. Only this account can open the admin panel.
          </p>
        </AdminSectionCard>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-bold text-ink">Sign out of this device</p>
            <p className="mt-0.5 text-[0.68rem] text-stone-400">Sessions last {SESSION_DURATION_MS / 3600000} hours on this browser.</p>
          </div>
          <AdminGhostButton onClick={onSignOut}>Sign out</AdminGhostButton>
        </div>
      </div>

      <div className="space-y-6">
        <AdminSectionCard title="Account">
          <AdminDataList
            items={[
              { label: 'Role', value: roleLabels[user.role] || user.role },
              { label: 'Last sign in', value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'This session is your first' },
              { label: 'Status', value: user.active ? 'Active' : 'Deactivated' },
              { label: 'Session', value: 'HttpOnly cookie, valid for 8 hours' },
            ]}
          />
        </AdminSectionCard>

        <AdminSectionCard title="Security" description="How this session is protected.">
          <ul className="space-y-2.5 text-xs leading-5 text-stone-500">
            <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> Your password is never stored in this browser.</li>
            <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> The session token lives in an HttpOnly cookie that scripts cannot read.</li>
            <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> Signing out revokes the session on the server, not just in this tab.</li>
          </ul>
        </AdminSectionCard>
      </div>
    </div>
  );
}

function DataTab({ orders, onSignOut }) {
  const [confirming, setConfirming] = useState(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Orders stored" value={orders.length} note="In this browser" icon={ShieldCheck} tone="green" />
        <AdminStatCard label="Storage" value="Browser only" note="No server database" icon={KeyRound} />
        <AdminStatCard label="Shared device" value="Be careful" note="Everyone sees these records" icon={Users} tone="amber" />
      </div>

      <AdminSectionCard title="What is stored" description="Each list is kept in this browser's local storage under its own key.">
        <AdminDataList items={storageSummary.map(([label, key]) => ({ label, value: `${key} · ${stored(key)}` }))} />
      </AdminSectionCard>

      <div className="rounded-2xl border border-rose-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-600">Danger area</p>
        <p className="mt-2 text-xs leading-5 text-stone-500">These actions cannot be undone. Export what you need first.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminGhostButton onClick={() => setConfirming({ key: 'spark-shine-orders', label: 'all order records' })}>Clear orders</AdminGhostButton>
          <AdminGhostButton onClick={() => setConfirming({ key: 'all', label: 'every record for this shop' })}>Clear everything</AdminGhostButton>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Clear ${confirming.label}?`}
          description="This cannot be undone and there is no server copy. Export anything you need first."
          confirmLabel="Yes, clear"
          tone="danger"
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            if (confirming.key === 'all') {
              storageSummary.forEach(([, key]) => clearStorage(key));
            } else {
              clearStorage(confirming.key);
            }
            setConfirming(null);
            onSignOut();
          }}
        />
      )}
    </div>
  );
}
