import { AlertTriangle, Eye, FileSpreadsheet, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog';
import { productStatusLabels } from '../data/productRecords';
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

const stockOptions = [
  { value: 'untracked', label: 'Not tracked' },
  { value: '0', label: '0 - out of stock' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: 'custom', label: 'Enter a number' },
];

const emptyDraft = { id: '', name: '', category: '', packSize: '1 Box', sellingPrice: '', mrp: '', stock: 'untracked', status: 'active', description: '', image: '' };

export function AdminProductsPage() {
  const { products, categories, catalog, addProduct, updateProduct, deleteProduct, setProductStatus, setProductStock, resetCatalog } = useCatalog();
  const feedback = useAdminFeedback();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busyId, setBusyId] = useState('');

  const counts = useMemo(() => {
    const byCategory = {};
    products.forEach((product) => {
      byCategory[product.category] = (byCategory[product.category] || 0) + 1;
    });
    return { byCategory, active: products.filter((product) => product.status === 'active').length, outOfStock: products.filter((product) => product.stock === 0).length };
  }, [products]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (status === 'active' && product.status !== 'active') return false;
      if (status === 'inactive' && product.status !== 'inactive') return false;
      if (status === 'out' && product.stock !== 0) return false;
      if (!needle) return true;
      return [product.name, product.code, product.category, product.packSize].join(' ').toLowerCase().includes(needle);
    });
  }, [products, search, category, status]);

  const stockValue = (value) => (value === 'untracked' ? null : value === 'custom' ? null : Number(value));

  const save = (draft) => {
    const payload = {
      ...draft,
      sellingPrice: Number(draft.sellingPrice) || 0,
      mrp: Number(draft.mrp) || Number(draft.sellingPrice) || 0,
      stock: stockValue(draft.stock),
    };
    if (editing) {
      updateProduct(editing.id, payload);
      feedback.notify(`${payload.name} updated.`);
    } else {
      const created = addProduct(payload);
      feedback.notify(`${created.name} added to the catalog.`);
    }
    setEditing(null);
    setCreating(false);
  };

  const exportProducts = () => {
    downloadExcel(`Anish-Enterprises-products-${new Date().toISOString().slice(0, 10)}`, {
      name: 'Products',
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Product' },
        { key: 'category', label: 'Category' },
        { key: 'packSize', label: 'Pack size' },
        { key: 'sellingPrice', label: 'Selling price' },
        { key: 'mrp', label: 'MRP' },
        { key: 'stock', label: 'Stock' },
        { key: 'status', label: 'Status' },
        { key: 'discount', label: 'Discount %' },
      ],
      rows: visible.map((product) => ({
        code: product.code,
        name: product.name,
        category: product.category,
        packSize: product.packSize,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        stock: product.stock === null ? 'Not tracked' : product.stock,
        status: productStatusLabels[product.status] || product.status,
        discount: product.mrp > product.sellingPrice ? Math.round((1 - product.sellingPrice / product.mrp) * 100) : 0,
      })),
    });
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Every product here is a real record: the storefront catalog, the product page, the cart and your order sheets all read this same list. Prices and stock saved here appear immediately on the shop."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminTinyButton onClick={exportProducts}><FileSpreadsheet size={13} /> Export</AdminTinyButton>
            <AdminTinyButton tone="red" onClick={() => setConfirmReset(true)}>Reset to price sheet</AdminTinyButton>
            <AdminPrimaryButton onClick={() => { setEditing(null); setCreating(true); }}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add product</span></AdminPrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Products" value={products.length} note={`${counts.active} active on the storefront`} icon={Package} />
        <AdminStatCard label="Categories" value={categories.length} note="Managed on the categories screen" icon={Search} tone="blue" />
        <AdminStatCard label="Out of stock" value={counts.outOfStock} note="Only products with a tracked zero count" icon={AlertTriangle} tone="red" />
        <AdminStatCard label="Catalog value" value={formatCurrency(catalog.catalogProducts.reduce((sum, product) => sum + product.price, 0))} note="Sum of all selling prices" icon={FileSpreadsheet} tone="green" />
      </div>

      <div className="space-y-4">
        <AdminTabs
          tabs={[
            { value: 'all', label: 'All', count: products.length },
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'inactive', label: 'Hidden', count: products.length - counts.active },
            { value: 'out', label: 'Out of stock', count: counts.outOfStock },
          ]}
          value={status}
          onChange={setStatus}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminSearch value={search} onChange={setSearch} placeholder="Search name, code or pack" />
          <AdminSelect value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((entry) => <option key={entry.id} value={entry.name}>{entry.label} ({counts.byCategory[entry.name] || 0})</option>)}
          </AdminSelect>
          <AdminGhostButton onClick={() => { setSearch(''); setCategory('all'); setStatus('all'); }}>Clear filters</AdminGhostButton>
        </div>
      </div>

      <AdminFeedback error={feedback.error} success={feedback.success} />

      {visible.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Selling</th>
                <th className="text-right">MRP</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id}>
                  <td>
                    <p className="font-bold text-ink">{product.name}</p>
                    <p className="mt-0.5 text-[0.65rem] text-stone-400">{product.code} · {product.packSize}</p>
                  </td>
                  <td>{product.category}</td>
                  <td className="text-right font-bold text-ink">{formatCurrency(product.sellingPrice)}</td>
                  <td className="text-right text-stone-500">{formatCurrency(product.mrp)}</td>
                  <td>
                    <AdminSelect
                      className="!w-32 !py-1.5 !text-xs"
                      value={product.stock === null ? 'untracked' : product.stock === 0 ? '0' : 'custom'}
                      onChange={(event) => {
                        setBusyId(product.id);
                        setProductStock(product.id, event.target.value === 'untracked' || event.target.value === 'custom' ? (event.target.value === 'custom' ? product.stock : null) : Number(event.target.value));
                        setBusyId('');
                      }}
                      disabled={busyId === product.id}
                    >
                      {product.stock !== null && !stockOptions.some((option) => option.value === String(product.stock)) && (
                        <option value="custom">{product.stock} in stock</option>
                      )}
                      {stockOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </AdminSelect>
                  </td>
                  <td>
                    <button type="button" onClick={() => setProductStatus(product.id, product.status === 'active' ? 'inactive' : 'active')}>
                      <StatusPill tone={product.status === 'active' ? 'green' : 'slate'}>{productStatusLabels[product.status]}</StatusPill>
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <AdminTinyButton onClick={() => { setCreating(false); setEditing(product); }}><span className="inline-flex items-center gap-1.5"><Pencil size={12} /> Edit</span></AdminTinyButton>
                      <Link to={`/products/${product.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink hover:text-ink"><Eye size={12} /> View</Link>
                      <AdminTinyButton tone="red" onClick={() => setConfirmDelete(product)}><Trash2 size={12} /></AdminTinyButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyAdminState icon={Package} title="No products match" copy="Clear the filters, or add a product that does not exist in the price sheet yet.">
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <AdminPrimaryButton onClick={() => setCreating(true)}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add product</span></AdminPrimaryButton>
            <AdminGhostButton onClick={() => { setSearch(''); setCategory('all'); setStatus('all'); }}>Clear filters</AdminGhostButton>
          </div>
        </EmptyAdminState>
      )}

      {(creating || editing) && (
        <ProductModal
          product={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={save}
          onError={feedback.fail}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this product?"
          description="The product disappears from the storefront catalog and cannot be added to new orders. Existing orders keep their own record of it."
          confirmLabel="Delete product"
          tone="red"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteProduct(confirmDelete.id);
            setConfirmDelete(null);
            feedback.notify(`${confirmDelete.name} deleted.`);
          }}
        >
          <p className="text-sm text-stone-600">{confirmDelete.name} ({confirmDelete.code}) will be removed from the catalog.</p>
        </ConfirmDialog>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset the catalog to the price sheet?"
          description="Every product and category edit made here is replaced by the original supplied catalog. This cannot be undone."
          confirmLabel="Reset catalog"
          tone="red"
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            resetCatalog();
            setConfirmReset(false);
            feedback.notify('Catalog reset to the supplied price sheet.');
          }}
        >
          <p className="text-sm text-stone-600">Products you added and price or stock changes you made will be discarded.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function ProductModal({ product, categories, onClose, onSave, onError }) {
  const [draft, setDraft] = useState(() => (product
    ? {
        name: product.name,
        category: product.category,
        packSize: product.packSize,
        sellingPrice: String(product.sellingPrice),
        mrp: String(product.mrp),
        stock: product.stock === null ? 'untracked' : stockOptions.some((option) => option.value === String(product.stock)) ? String(product.stock) : 'custom',
        customStock: product.stock === null ? '' : String(product.stock),
        status: product.status,
        description: product.description,
        image: product.image || '',
      }
    : { ...emptyDraft, category: categories[0]?.name || '' }));

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = () => {
    if (!draft.name.trim()) return onError('Enter the product name.');
    if (!draft.category) return onError('Choose a category.');
    const price = Number(draft.sellingPrice);
    if (!Number.isFinite(price) || price < 0) return onError('Enter a valid selling price.');
    const mrp = Number(draft.mrp);
    if (draft.mrp !== '' && (!Number.isFinite(mrp) || mrp < price)) return onError('MRP must be the same as or higher than the selling price.');
    onSave({
      ...draft,
      stock: draft.stock === 'custom' ? Number(draft.customStock) || 0 : draft.stock,
    });
  };

  return (
    <Modal title={product ? 'Edit product' : 'Add product'} description="Saved records drive the storefront catalog, the product page and new orders." onClose={onClose}>
      <div className="space-y-4">
        <AdminField label="Product name" required>
          <AdminInput value={draft.name} onChange={(event) => setField('name', event.target.value)} placeholder="Eg. 5 Gun Chakkars" />
        </AdminField>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Category" required>
            <AdminSelect value={draft.category} onChange={(event) => setField('category', event.target.value)}>
              {categories.map((entry) => <option key={entry.id} value={entry.name}>{entry.label}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Pack size" hint="Shown on the card and the invoice.">
            <AdminInput value={draft.packSize} onChange={(event) => setField('packSize', event.target.value)} />
          </AdminField>
          <AdminField label="Selling price" required hint="What the customer pays.">
            <AdminInput type="number" min="0" step="0.01" value={draft.sellingPrice} onChange={(event) => setField('sellingPrice', event.target.value)} />
          </AdminField>
          <AdminField label="MRP" hint="Shown struck through. Leave blank to match the selling price.">
            <AdminInput type="number" min="0" step="0.01" value={draft.mrp} onChange={(event) => setField('mrp', event.target.value)} />
          </AdminField>
          <AdminField label="Stock" hint="Not tracked means the storefront never shows out of stock for this item.">
            <AdminSelect value={draft.stock} onChange={(event) => setField('stock', event.target.value)} options={stockOptions} />
          </AdminField>
          {draft.stock === 'custom' && (
            <AdminField label="Stock quantity" required>
              <AdminInput type="number" min="0" value={draft.customStock} onChange={(event) => setField('customStock', event.target.value)} />
            </AdminField>
          )}
          <AdminField label="Status">
            <AdminSelect value={draft.status} onChange={(event) => setField('status', event.target.value)}>
              <option value="active">Active - shown in the catalog</option>
              <option value="inactive">Hidden - kept but not listed</option>
            </AdminSelect>
          </AdminField>
        </div>
        <AdminField label="Description" hint="Optional. Shown on the product page when present.">
          <AdminTextarea value={draft.description} onChange={(event) => setField('description', event.target.value)} />
        </AdminField>
        <AdminField label="Image" hint="Optional. Path to this product's photo, e.g. /images/products/product7.jpeg. Leave blank to use the photo numbered for this product.">
          <AdminInput value={draft.image} onChange={(event) => setField('image', event.target.value)} placeholder="/images/products/product7.jpeg" />
        </AdminField>
        <AdminFormActions>
          <AdminGhostButton onClick={onClose}>Cancel</AdminGhostButton>
          <AdminPrimaryButton onClick={submit}>{product ? 'Save product' : 'Add product'}</AdminPrimaryButton>
        </AdminFormActions>
      </div>
    </Modal>
  );
}
