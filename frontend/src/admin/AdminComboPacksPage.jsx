import { Eye, Gift, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { packKindLabels } from '../data/packRecords';
import { useCatalog } from '../hooks/useCatalog';
import { formatCurrency } from '../utils/format';
import { downloadExcel } from '../utils/documents';
import {
  AdminFeedback,
  AdminField,
  AdminFormActions,
  AdminGhostButton,
  AdminInput,
  AdminPageHeader,
  AdminPrimaryButton,
  AdminSearch,
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

const emptyDraft = { name: '', kind: 'combo', packSize: '1 Combo Box', price: '', mrp: '', stock: 'untracked', badge: '', description: '', items: [], active: true };

export function AdminComboPacksPage() {
  const { packs, products, addPack, updatePack, deletePack, setPackStatus, resetPacks } = useCatalog();
  const feedback = useAdminFeedback();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return packs.filter((pack) => {
      if (filter === 'active' && !pack.active) return false;
      if (filter === 'hidden' && pack.active) return false;
      if (filter === 'gift' && pack.kind !== 'gift-box') return false;
      if (filter === 'combo' && pack.kind !== 'combo') return false;
      if (filter === 'out' && pack.stock !== 0) return false;
      if (!needle) return true;
      return [pack.name, pack.code, pack.description].join(' ').toLowerCase().includes(needle);
    });
  }, [packs, search, filter]);

  const counts = useMemo(() => ({
    active: packs.filter((pack) => pack.active).length,
    gift: packs.filter((pack) => pack.kind === 'gift-box').length,
    out: packs.filter((pack) => pack.stock === 0).length,
    value: packs.reduce((sum, pack) => sum + pack.price, 0),
    items: packs.reduce((sum, pack) => sum + pack.items.length, 0),
  }), [packs]);

  const save = (draft) => {
    if (editing) {
      updatePack(editing.id, draft);
      feedback.notify(`${draft.name} updated.`);
    } else {
      addPack(draft);
      feedback.notify(`${draft.name} added to Combo & Gift.`);
    }
    setEditing(null);
    setCreating(false);
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Combo &amp; gift packs"
        description="These packs are the tiles on the Combo & Gift page and the shortcut cards on the homepage. Price, MRP, stock and visibility saved here are what shoppers see."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminTinyButton onClick={() => downloadExcel(`Anish-Enterprises-packs-${new Date().toISOString().slice(0, 10)}`, {
              name: 'Packs',
              columns: [
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Pack' },
                { key: 'kind', label: 'Kind' },
                { key: 'price', label: 'Price' },
                { key: 'mrp', label: 'MRP' },
                { key: 'items', label: 'Items' },
                { key: 'stock', label: 'Stock' },
                { key: 'active', label: 'Visible' },
              ],
              rows: visible.map((pack) => ({ code: pack.code, name: pack.name, kind: packKindLabels[pack.kind], price: pack.price, mrp: pack.mrp, items: pack.items.length, stock: pack.stock === null ? 'Not tracked' : pack.stock, active: pack.active ? 'Yes' : 'No' })),
              totals: ['', 'Total', '', counts.value, '', '', '', ''],
            })}>
              Export
            </AdminTinyButton>
            <AdminTinyButton tone="red" onClick={() => setConfirmReset(true)}>Reset packs</AdminTinyButton>
            <AdminPrimaryButton onClick={() => { setEditing(null); setCreating(true); }}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add pack</span></AdminPrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Packs" value={packs.length} note={`${counts.active} live on the storefront`} icon={Gift} />
        <AdminStatCard label="Gift boxes" value={counts.gift} note="Ready-to-give assortments" icon={Package} tone="blue" />
        <AdminStatCard label="Catalogued items" value={counts.items} note="Product references across all packs" icon={Search} tone="violet" />
        <AdminStatCard label="Combined value" value={formatCurrency(counts.value)} note="Sum of all pack prices" icon={Gift} tone="green" />
      </div>

      <div className="space-y-4">
        <AdminTabs
          tabs={[
            { value: 'all', label: 'All', count: packs.length },
            { value: 'active', label: 'Live', count: counts.active },
            { value: 'hidden', label: 'Hidden', count: packs.length - counts.active },
            { value: 'gift', label: 'Gift boxes', count: counts.gift },
            { value: 'combo', label: 'Combos', count: packs.length - counts.gift },
            { value: 'out', label: 'Out of stock', count: counts.out },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <AdminSearch value={search} onChange={setSearch} placeholder="Search packs" className="max-w-md" />
      </div>

      <AdminFeedback error={feedback.error} success={feedback.success} />

      {visible.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((pack) => (
            <article key={pack.id} className="admin-card flex flex-col rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={pack.kind === 'gift-box' ? 'blue' : 'orange'}>{packKindLabels[pack.kind]}</StatusPill>
                    {!pack.active && <StatusPill tone="slate">Hidden</StatusPill>}
                    {pack.stock === 0 && <StatusPill tone="red">Out of stock</StatusPill>}
                  </p>
                  <h3 className="mt-2.5 font-display text-2xl leading-tight tracking-[-0.03em] text-ink">{pack.name}</h3>
                  <p className="mt-1 text-[0.65rem] text-stone-400">{[pack.code, pack.packSize, `${pack.items.length} items`].filter(Boolean).join(' · ')}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-lg font-bold text-ink">{formatCurrency(pack.price)}</span>
                  {pack.mrp > pack.price && <span className="block text-[0.65rem] text-stone-400 line-through">{formatCurrency(pack.mrp)}</span>}
                </p>
              </div>
              {pack.description && <p className="mt-3 text-xs leading-5 text-stone-500">{pack.description}</p>}
              {pack.items.length > 0 && (
                <p className="mt-3 line-clamp-2 text-[0.68rem] leading-5 text-stone-400">{pack.items.map((item) => item.name).join(', ')}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-tintEdge pt-4">
                <AdminTinyButton onClick={() => { setCreating(false); setEditing(pack); }}><span className="inline-flex items-center gap-1.5"><Pencil size={12} /> Edit</span></AdminTinyButton>
                <AdminTinyButton tone={pack.active ? 'stone' : 'green'} onClick={() => { setPackStatus(pack.id, !pack.active); feedback.notify(`${pack.name} is now ${pack.active ? 'hidden' : 'live'}.`); }}>
                  {pack.active ? 'Hide' : 'Publish'}
                </AdminTinyButton>
                <Link to="/combo-packs" className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink hover:text-ink"><Eye size={12} /> View</Link>
                <AdminTinyButton tone="red" onClick={() => setConfirmDelete(pack)}><Trash2 size={12} /></AdminTinyButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyAdminState icon={Gift} title="No packs match" copy="Clear the filters, or add a pack that is not in the supplied assortment.">
          <div className="mt-6"><AdminPrimaryButton onClick={() => setCreating(true)}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add pack</span></AdminPrimaryButton></div>
        </EmptyAdminState>
      )}

      {(creating || editing) && (
        <PackModal
          pack={editing}
          products={products}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={save}
          onError={feedback.fail}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this pack?"
          description="The tile is removed from the Combo & Gift page and the homepage. Orders that already contain it keep their own record."
          confirmLabel="Delete pack"
          tone="red"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            deletePack(confirmDelete.id);
            setConfirmDelete(null);
            feedback.notify(`${confirmDelete.name} deleted.`);
          }}
        >
          <p className="text-sm text-stone-600">{confirmDelete.name} will no longer be offered to customers.</p>
        </ConfirmDialog>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset the packs?"
          description="Every pack edit is replaced by the assortment that ships with the site."
          confirmLabel="Reset packs"
          tone="red"
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            resetPacks();
            setConfirmReset(false);
            feedback.notify('Packs reset to the supplied assortment.');
          }}
        >
          <p className="text-sm text-stone-600">Packs you added, and any price, stock or visibility change, will be discarded.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function PackModal({ pack, products, onClose, onSave, onError }) {
  const [draft, setDraft] = useState(() => (pack
    ? {
        name: pack.name,
        kind: pack.kind,
        packSize: pack.packSize,
        price: String(pack.price),
        mrp: String(pack.mrp),
        stock: pack.stock === null ? 'untracked' : String(pack.stock),
        badge: pack.badge || '',
        description: pack.description || '',
        active: pack.active,
        items: pack.items.map((item) => ({ ...item })),
      }
    : { ...emptyDraft }));

  const [picker, setPicker] = useState('');
  const [qty, setQty] = useState(1);

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const addItem = () => {
    const needle = picker.trim().toLowerCase();
    if (!needle) return;
    const match = products.find((product) => product.code.toLowerCase() === needle || product.name.toLowerCase() === needle);
    if (!match) return onError('No product matches that code or name.');
    setDraft((current) => {
      const existing = current.items.find((item) => item.productId === match.id);
      if (existing) {
        return { ...current, items: current.items.map((item) => (item.productId === match.id ? { ...item, qty: item.qty + qty } : item)) };
      }
      return { ...current, items: [...current.items, { productId: match.id, name: match.name, qty }] };
    });
    setPicker('');
  };

  const submit = () => {
    if (!draft.name.trim()) return onError('Enter the pack name.');
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price <= 0) return onError('Enter a valid pack price.');
    const mrp = Number(draft.mrp);
    if (draft.mrp !== '' && (!Number.isFinite(mrp) || mrp < price)) return onError('MRP must be the same as or higher than the pack price.');
    onSave({
      ...draft,
      price,
      mrp: draft.mrp === '' ? price : mrp,
      stock: draft.stock === 'untracked' ? null : Number(draft.stock) || 0,
    });
  };

  return (
    <Modal title={pack ? 'Edit pack' : 'Add pack'} description="Packs are managed as their own records, so price and stock do not depend on the products inside." onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Pack name" required>
            <AdminInput value={draft.name} onChange={(event) => setField('name', event.target.value)} placeholder="Eg. Diwali Premium Box" />
          </AdminField>
          <AdminField label="Kind" required>
            <AdminSelect value={draft.kind} onChange={(event) => setField('kind', event.target.value)}>
              <option value="combo">Combo pack</option>
              <option value="gift-box">Gift box</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Pack price" required>
            <AdminInput type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setField('price', event.target.value)} />
          </AdminField>
          <AdminField label="MRP" hint="Leave blank to match the pack price.">
            <AdminInput type="number" min="0" step="0.01" value={draft.mrp} onChange={(event) => setField('mrp', event.target.value)} />
          </AdminField>
          <AdminField label="Pack size text">
            <AdminInput value={draft.packSize} onChange={(event) => setField('packSize', event.target.value)} />
          </AdminField>
          <AdminField label="Stock" hint="Not tracked means the pack is always shown as available.">
            <AdminInput value={draft.stock} onChange={(event) => setField('stock', event.target.value)} placeholder="Not tracked" />
          </AdminField>
        </div>

        <AdminField label="Description" hint="Shown on the pack card and the homepage shortcut.">
          <AdminTextarea value={draft.description} onChange={(event) => setField('description', event.target.value)} />
        </AdminField>

        <div className="rounded-2xl border border-tintEdge bg-white p-4">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-stone-500">Contents</p>
          <p className="mt-1 text-[0.65rem] text-stone-400">Listed on the pack card as the itemised contents.</p>
          <div className="mt-3 space-y-2">
            {draft.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 px-3.5 py-2.5">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{item.name}</p>
                <div className="flex items-center gap-2">
                  <AdminInput className="!w-20 !py-1.5 !text-xs" type="number" min="1" value={item.qty} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((entry) => (entry.productId === item.productId ? { ...entry, qty: Math.max(1, Number(event.target.value) || 1) } : entry)) }))} />
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((entry) => entry.productId !== item.productId) }))} className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${item.name}`}><X size={14} /></button>
                </div>
              </div>
            ))}
            {!draft.items.length && <p className="rounded-xl bg-stone-50 px-4 py-4 text-center text-xs text-stone-500">No items listed yet.</p>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
            <AdminField label="Add a product">
              <AdminInput list="admin-pack-picker" value={picker} onChange={(event) => setPicker(event.target.value)} placeholder="Code or product name" />
            </AdminField>
            <AdminField label="Qty">
              <AdminInput type="number" min="1" value={qty} onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))} />
            </AdminField>
            <div className="flex items-end">
              <AdminGhostButton onClick={addItem}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add</span></AdminGhostButton>
            </div>
          </div>
          <datalist id="admin-pack-picker">
            {products.map((product) => <option key={product.id} value={product.code}>{product.name}</option>)}
          </datalist>
        </div>

        <AdminField label="Visibility">
          <AdminSelect value={draft.active ? 'live' : 'hidden'} onChange={(event) => setField('active', event.target.value === 'live')}>
            <option value="live">Live on the storefront</option>
            <option value="hidden">Hidden from customers</option>
          </AdminSelect>
        </AdminField>

        <AdminFormActions>
          <AdminGhostButton onClick={onClose}>Cancel</AdminGhostButton>
          <AdminPrimaryButton onClick={submit}>{pack ? 'Save pack' : 'Add pack'}</AdminPrimaryButton>
        </AdminFormActions>
      </div>
    </Modal>
  );
}
