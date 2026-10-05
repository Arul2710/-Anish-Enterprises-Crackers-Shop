import { CheckCircle2, FileSpreadsheet, FileUp, TriangleAlert, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { products } from '../data/products';
import { formatCategory, formatCurrency } from '../utils/format';
import { AdminPageHeader, AdminStatCard, PreviewNotice, StatusPill, SuccessMessage, ValidationMessage } from './AdminUI';

export function AdminImportPage() {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [imported, setImported] = useState(false);
  const previewRows = products.slice(0, 8);

  const selectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validExtension = /\.(xlsx|xls)$/i.test(file.name);
    if (!validExtension) {
      setFileError('Please choose an .xlsx or .xls workbook.');
      return;
    }
    setFileError('');
    setFileName(file.name);
    setImported(false);
  };

  const runPreviewImport = () => {
    if (!fileName) {
      setFileError('Choose a workbook before starting the preview.');
      return;
    }
    setImported(true);
  };

  return <div className="space-y-8">
    <AdminPageHeader eyebrow="Catalog ingestion" title="Excel import" description="Preview the future upload workflow for the supplied product workbook. This phase does not save to MongoDB or any backend." />
    <PreviewNotice><strong>Frontend-only import preview.</strong> The preview below uses the normalized catalog snapshot from <strong>Order Crackers 2026.xlsx</strong>. A future backend service will parse the uploaded file, validate rows and persist them after review.</PreviewNotice>
    <div className="grid gap-4 sm:grid-cols-3"><AdminStatCard label="Preview rows" value={products.length} note="Actual normalized catalog rows" icon={FileSpreadsheet} /><AdminStatCard label="Worksheet" value="Order" note="From source workbook" tone="blue" /><AdminStatCard label="Database status" value="Offline" note="No backend connected" tone="violet" /></div>
    <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="admin-card rounded-2xl p-5 sm:p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-marigold/30 bg-secondarySoft text-goldInk"><FileUp size={23} /></div><h2 className="mt-6 font-display text-3xl tracking-[-0.04em] text-ink">Upload a workbook</h2><p className="mt-3 text-sm leading-6 text-stone-500">Choose an Excel file to begin a validation preview. The file is not uploaded or stored by this frontend.</p><input ref={inputRef} className="hidden" type="file" accept=".xlsx,.xls" onChange={selectFile} /><button className="btn-secondary mt-7 w-full" type="button" onClick={() => inputRef.current?.click()}><Upload size={15} /> Choose Excel file</button>{fileName && <div className="mt-4 flex items-center gap-3 rounded-xl border border-stone-100 bg-secondarySoft p-3"><FileSpreadsheet className="text-goldInk" size={18} /><div className="min-w-0"><p className="truncate text-xs font-bold text-ink">{fileName}</p><p className="mt-1 text-[0.62rem] text-stone-400">Selected for preview only</p></div><CheckCircle2 className="ml-auto text-emerald-500" size={17} /></div>}{fileError && <div className="mt-4"><ValidationMessage>{fileError}</ValidationMessage></div>}<div className="mt-7 border-t border-stone-100 pt-6"><p className="field-label">Validation notes</p><div className="mt-3 space-y-3"><ValidationMessage>QUANTITY and AMOUNT are blank in the source sheet.</ValidationMessage><ValidationMessage>A confirmed customer-facing selling price is not present.</ValidationMessage><p className="flex items-center gap-2 text-xs text-stone-500"><CheckCircle2 className="text-emerald-500" size={14} /> Product names and categories are preserved.</p></div></div><button className="btn-primary mt-7 w-full" type="button" onClick={runPreviewImport} disabled={!fileName}>{imported ? 'Preview complete' : 'Import Products'} <FileUp size={15} /></button>{imported && <div className="mt-4"><SuccessMessage>Preview complete — no data was saved to MongoDB.</SuccessMessage></div>}</div>
      <div className="admin-card overflow-hidden rounded-2xl"><div className="flex items-center justify-between gap-4 border-b border-stone-100 p-5 sm:p-7"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-400">Product preview</p><h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-ink">Ready to review</h2></div><StatusPill tone="blue">First {previewRows.length} rows</StatusPill></div><div className="admin-table-wrap rounded-none border-0"><table className="admin-table"><thead><tr><th>#</th><th>Product name</th><th>Category</th><th>RATE</th><th>NET RAT</th><th>Pack</th></tr></thead><tbody>{previewRows.map((product) => <tr key={product.id}><td className="text-xs text-stone-400">{String(product.sourceSerial).padStart(3, '0')}</td><td className="max-w-[15rem] truncate font-bold text-ink">{product.name}</td><td className="text-xs">{formatCategory(product.category)}</td><td className="text-xs">{formatCurrency(product.rate)}</td><td className="text-xs font-bold text-goldInk">{formatCurrency(product.netRate)}</td><td className="text-xs text-stone-400">{product.packSize}</td></tr>)}</tbody></table></div><div className="flex items-center gap-2 border-t border-stone-100 p-5 text-xs text-stone-400 sm:p-7"><TriangleAlert size={15} className="text-goldInk" /> Remaining {products.length - previewRows.length} rows are available in the source snapshot.</div></div>
    </section>
  </div>;
}
