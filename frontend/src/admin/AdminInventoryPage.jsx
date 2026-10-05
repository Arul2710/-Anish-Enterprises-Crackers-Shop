import { Boxes, ClipboardCheck, Search, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminPageHeader, AdminStatCard, PreviewNotice, StatusPill } from './AdminUI';
import { products as sourceProducts, categoryDetails } from '../data/products';
import { formatCategory } from '../utils/format';

export function AdminInventoryPage() {
  const [inventory, setInventory] = useState(sourceProducts);
  const [search, setSearch] = useState('');
  const [onlyNeedsConfirmation, setOnlyNeedsConfirmation] = useState(false);
  const visible = useMemo(() => inventory.filter((product) => {
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || [product.name, product.category, String(product.sourceSerial)].some((value) => value.toLowerCase().includes(query));
    const matchesFilter = !onlyNeedsConfirmation || product.stock === null || product.stock === undefined;
    return matchesSearch && matchesFilter;
  }), [inventory, onlyNeedsConfirmation, search]);
  const unknownCount = inventory.filter((product) => product.stock === null || product.stock === undefined).length;
  const updateStock = (id, value) => setInventory((current) => current.map((product) => product.id === id ? { ...product, stock: value === '' ? null : Number(value), availability: value === '' ? 'Confirm availability' : Number(value) > 0 ? 'In stock' : 'Out of stock' } : product));

  return <div className="space-y-8">
    <AdminPageHeader eyebrow="Stock visibility" title="Inventory" description="Review the catalog's inventory readiness without filling in quantities the Excel file does not contain." action={<button className="btn-secondary" type="button" onClick={() => setOnlyNeedsConfirmation((value) => !value)}><TriangleAlert size={15} /> {onlyNeedsConfirmation ? 'Show all' : 'Needs confirmation'}</button>} />
    <PreviewNotice>The workbook&apos;s QUANTITY and AMOUNT cells are blank. Initial inventory values are therefore <strong>unknown</strong> below. Any value entered here is a temporary UI demonstration and is not saved.</PreviewNotice>
    <div className="grid gap-4 sm:grid-cols-3"><AdminStatCard label="Catalog rows" value={inventory.length} note="Actual source listings" icon={Boxes} /><AdminStatCard label="Needs confirmation" value={unknownCount} note="No quantity supplied in Excel" icon={TriangleAlert} tone="blue" /><AdminStatCard label="Categories" value={categoryDetails.length} note="Source structure preserved" icon={ClipboardCheck} tone="green" /></div>
    <section className="space-y-4"><label className="flex max-w-md items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-3 text-stone-400"><Search size={16} /><input className="w-full bg-transparent text-sm text-ink outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inventory" aria-label="Search inventory" /></label><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Catalog item</th><th>Category</th><th>Source quantity</th><th>Temporary stock entry</th><th>Status</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td><p className="max-w-[15rem] truncate font-bold text-ink">{product.name}</p><p className="mt-1 text-[0.62rem] text-stone-400">#{String(product.sourceSerial).padStart(3, '0')} · {product.packSize}</p></td><td className="text-xs">{formatCategory(product.category)}</td><td><span className="inline-flex items-center gap-1.5 text-xs text-stone-400"><span className="h-1.5 w-1.5 rounded-full bg-stone-300" /> Blank in source</span></td><td><input className="field-input max-w-28 py-2 text-sm" type="number" min="0" value={product.stock ?? ''} onChange={(event) => updateStock(product.id, event.target.value)} placeholder="Unknown" aria-label={`Temporary stock for ${product.name}`} /></td><td><StatusPill tone={product.stock === null || product.stock === undefined ? 'orange' : product.stock > 0 ? 'green' : 'red'}>{product.availability}</StatusPill></td></tr>)}</tbody></table>{!visible.length && <div className="p-10 text-center text-sm text-stone-500">No inventory rows match this view.</div>}</div></section>
  </div>;
}
