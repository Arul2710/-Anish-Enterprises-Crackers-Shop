import { GripVertical, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog';
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
  AdminTextarea,
  AdminTinyButton,
  ConfirmDialog,
  EmptyAdminState,
  Modal,
  StatusPill,
  useAdminFeedback,
} from './AdminUI';

const toneOptions = [
  { value: 'orange', label: 'Ember' },
  { value: 'gold', label: 'Gold' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'violet', label: 'Violet' },
  { value: 'pink', label: 'Pink' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'red', label: 'Red' },
];

export function AdminCategoriesPage() {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useCatalog();
  const feedback = useAdminFeedback();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        count: products.filter((product) => product.category === category.name).length,
        value: products.filter((product) => product.category === category.name).reduce((sum, product) => sum + product.sellingPrice, 0),
      }))
      .filter((category) => (needle ? [category.name, category.label, category.description].join(' ').toLowerCase().includes(needle) : true))
      .sort((first, second) => first.order - second.order);
  }, [categories, products, search]);

  const orphans = products.filter((product) => !categories.some((category) => category.name === product.category));

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="Categories drive the catalog filter, the homepage category cards and the category links in the footer. Renaming a category keeps its products attached."
        action={<AdminPrimaryButton onClick={() => { setEditing(null); setCreating(true); }}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add category</span></AdminPrimaryButton>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Categories" value={categories.length} note="Shown in the catalog filter" icon={Tags} />
        <AdminStatCard label="Active" value={categories.filter((category) => category.active).length} note="Visible to shoppers" icon={Tags} tone="green" />
        <AdminStatCard label="Hidden" value={categories.filter((category) => !category.active).length} note="Kept for existing links" icon={Tags} tone="slate" />
        <AdminStatCard label="Uncategorised products" value={orphans.length} note={orphans.length ? 'These are not listed in the filter' : 'Every product has a category'} icon={Search} tone={orphans.length ? 'red' : 'green'} />
      </div>

      {orphans.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {orphans.length} product{orphans.length === 1 ? '' : 's'} use a category that is not in this list: {orphans.slice(0, 4).map((product) => product.category).join(', ')}.
          Add the category to bring them back into the filter.
        </div>
      )}

      <AdminSearch value={search} onChange={setSearch} placeholder="Search categories" className="max-w-md" />
      <AdminFeedback error={feedback.error} success={feedback.success} />

      {rows.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Label shown</th>
                <th className="text-right">Products</th>
                <th>Visibility</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((category) => (
                <tr key={category.id}>
                  <td>
                    <p className="flex items-center gap-2 font-bold text-ink"><GripVertical size={14} className="text-stone-300" />{category.name}</p>
                    <p className="mt-0.5 max-w-xs text-[0.65rem] text-stone-400">{category.description || 'No description'}</p>
                  </td>
                  <td>{category.label}</td>
                  <td className="text-right font-bold text-ink">{category.count}</td>
                  <td>
                    <button type="button" onClick={() => { updateCategory(category.id, { active: !category.active }); feedback.notify(`${category.label} is now ${category.active ? 'hidden' : 'visible'}.`); }}>
                      <StatusPill tone={category.active ? 'green' : 'slate'}>{category.active ? 'Visible' : 'Hidden'}</StatusPill>
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/products?category=${encodeURIComponent(category.name)}`} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink hover:text-ink">View</Link>
                      <AdminTinyButton onClick={() => { setCreating(false); setEditing(category); }}><span className="inline-flex items-center gap-1.5"><Pencil size={12} /> Edit</span></AdminTinyButton>
                      <AdminTinyButton tone="red" onClick={() => setConfirmDelete(category)}><Trash2 size={12} /></AdminTinyButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyAdminState icon={Tags} title="No categories" copy="Add a category so products can be grouped in the catalog filter.">
          <div className="mt-6"><AdminPrimaryButton onClick={() => setCreating(true)}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add category</span></AdminPrimaryButton></div>
        </EmptyAdminState>
      )}

      {(creating || editing) && (
        <CategoryModal
          category={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(draft) => {
            if (editing) {
              updateCategory(editing.id, draft);
              feedback.notify(`${draft.label} updated.`);
            } else {
              addCategory(draft);
              feedback.notify(`${draft.label} added.`);
            }
            setEditing(null);
            setCreating(false);
          }}
          onError={feedback.fail}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this category?"
          description="Products in this category stay in the catalog but stop appearing under a filter. Renaming or hiding is usually safer."
          confirmLabel="Delete category"
          tone="red"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteCategory(confirmDelete.id);
            setConfirmDelete(null);
            feedback.notify(`${confirmDelete.label} deleted.`);
          }}
        >
          <p className="text-sm text-stone-600">
            {confirmDelete.label} currently holds {products.filter((product) => product.category === confirmDelete.name).length} products.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function CategoryModal({ category, onClose, onSave, onError }) {
  const [draft, setDraft] = useState(() => ({
    name: category?.name || '',
    label: category?.label || '',
    description: category?.description || '',
    tone: category?.tone || 'orange',
    active: category?.active !== false,
  }));

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = () => {
    if (!draft.name.trim()) return onError('Enter the category name used in the price sheet.');
    if (!draft.label.trim()) return onError('Enter the label shoppers will see.');
    onSave(draft);
  };

  return (
    <Modal title={category ? 'Edit category' : 'Add category'} description="The name links products to this category; the label is what customers read." onClose={onClose}>
      <div className="space-y-4">
        <AdminField label="Category name" required hint="Matches the category in the price sheet, for example SPARKLERS.">
          <AdminInput value={draft.name} onChange={(event) => setField('name', event.target.value)} />
        </AdminField>
        <AdminField label="Label shown to customers" required>
          <AdminInput value={draft.label} onChange={(event) => setField('label', event.target.value)} />
        </AdminField>
        <AdminField label="Description" hint="Shown on the homepage category card.">
          <AdminTextarea value={draft.description} onChange={(event) => setField('description', event.target.value)} />
        </AdminField>
        <AdminField label="Colour tone">
          <AdminSelect value={draft.tone} onChange={(event) => setField('tone', event.target.value)} options={toneOptions} />
        </AdminField>
        <AdminField label="Visibility">
          <AdminSelect value={draft.active ? 'visible' : 'hidden'} onChange={(event) => setField('active', event.target.value === 'visible')}>
            <option value="visible">Visible in the catalog filter</option>
            <option value="hidden">Hidden from the filter</option>
          </AdminSelect>
        </AdminField>
        <AdminFormActions>
          <AdminGhostButton onClick={onClose}>Cancel</AdminGhostButton>
          <AdminPrimaryButton onClick={submit}>{category ? 'Save category' : 'Add category'}</AdminPrimaryButton>
        </AdminFormActions>
      </div>
    </Modal>
  );
}
