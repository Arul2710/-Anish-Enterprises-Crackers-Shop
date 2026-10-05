import { formatCurrency } from './format';
import { orderUnitCount, outstandingAmount } from '../services/orders';

/* ------------------------------------------------------------------ helpers */

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

export const readableDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const readableDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fileSafeDate = () => new Date().toISOString().slice(0, 10);

/**
 * File names come from labels that can contain anything a user typed, such as a date
 * range with a slash in it. Browsers treat a slash as a folder separator, so the save
 * would silently fail or land somewhere unexpected. Anything that is not a letter,
 * digit, dot, dash or underscore becomes a dash.
 */
export const safeFileName = (value, fallback = 'export') => {
  const cleaned = String(value ?? '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || fallback;
};

export const businessLines = (business) =>
  [business?.address, [business?.city, business?.state].filter(Boolean).join(', '), business?.phone, business?.email]
    .filter(Boolean)
    .join(' · ');

const businessName = (business) => business?.businessName || 'Anish Enterprises';

/* ------------------------------------------------------------------ printing */

const documentStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; font-family: 'Poppins', Calibri, Arial, Helvetica, sans-serif; color: #0b1f0b; font-size: 13px; line-height: 1.55; background: #ffffff; }
  .sheet { max-width: 780px; margin: 0 auto; }
  .sheet.wide { max-width: 1080px; }
  .masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; border-bottom: 2px solid #D4AF37; padding-bottom: 14px; }
  .masthead h1 { margin: 0; font-size: 22px; letter-spacing: -0.02em; }
  .masthead p { margin: 4px 0 0; font-size: 11.5px; color: #3f6b3f; }
  .title { margin: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.14em; color: #6b5215; }
  .status { display: inline-block; margin-top: 8px; padding: 3px 10px; border: 1px solid #e8dcbc; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .grid { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 18px; }
  .block { flex: 1 1 200px; border: 1px solid #eae7dd; border-radius: 10px; padding: 12px 14px; }
  .block h2 { margin: 0 0 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #5a7a5a; }
  .block p { margin: 0 0 3px; font-size: 12.5px; }
  .muted { color: #3f6b3f; }
  h3.section { margin: 26px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #5a7a5a; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #f4faf2; border-bottom: 1px solid #eae7dd; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #3f6b3f; }
  td { border-bottom: 1px solid #f6f8f4; padding: 8px 10px; font-size: 12.5px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .kind { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 999px; background: #fdf9ee; color: #6b5215; font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .totals { margin-top: 14px; margin-left: auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 12.5px; }
  .totals .grand { margin-top: 4px; border-top: 1px solid #eae7dd; padding-top: 8px; font-size: 15px; font-weight: 700; }
  .notes { margin-top: 18px; border-left: 3px solid #D4AF37; background: #f4faf2; padding: 12px 14px; }
  .notes h2 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #5a7a5a; }
  .notes p { margin: 0; font-size: 12.5px; }
  .signoff { display: flex; justify-content: space-between; gap: 24px; margin-top: 34px; }
  .signoff div { flex: 1; border-top: 1px solid #e8dcbc; padding-top: 6px; font-size: 10.5px; color: #3f6b3f; }
  footer { margin-top: 26px; border-top: 1px solid #eae7dd; padding-top: 10px; font-size: 10.5px; color: #5a7a5a; }
  .toolbar { margin: 0 auto 20px; max-width: 780px; text-align: right; }
  .toolbar button { background: #D4AF37; border: 0; border-radius: 999px; color: #002b00; cursor: pointer; font-size: 12px; font-weight: 700; padding: 9px 18px; }
  .toolbar p { margin: 6px 0 0; font-size: 11px; color: #3f6b3f; }
  @media print { body { padding: 0; } .toolbar { display: none; } .block, table, .notes { page-break-inside: avoid; } }
`;

/**
 * Compact A4 layout for the single order sheet. It is scoped to `.sheet.order-sheet`
 * so the order list and sales reports keep their roomier layout, and it layers on top
 * of the shared styles rather than replacing them, so the sheet still matches the
 * shop's own colours and type.
 *
 * The sheet is a fixed-width A4 document, so every measurement is expressed in mm or
 * in points rather than in screen pixels. Fixed column widths plus `table-layout:
 * fixed` are what let a long product name wrap inside its own cell instead of
 * stretching the table off the page.
 */
const orderSheetStyles = `
  @page { size: A4 portrait; margin: 9mm 10mm; }
  .sheet.order-sheet { max-width: 190mm; }
  .sheet.order-sheet .masthead { align-items: center; gap: 12px; border-bottom-width: 1.5px; padding-bottom: 4px; }
  .sheet.order-sheet .masthead h1 { font-size: 15px; line-height: 1.15; text-transform: uppercase; letter-spacing: 0.05em; }
  .sheet.order-sheet .masthead p { margin: 1px 0 0; font-size: 8.5px; line-height: 1.2; }
  .sheet.order-sheet .title { font-size: 10.5px; line-height: 1.15; }
  .sheet.order-sheet .status { margin-top: 2px; padding: 1px 6px; font-size: 8px; }

  /* Customer, order and payment details pack into a six column grid, so the whole
     block is a few short rows rather than three tall bordered cards. */
  .sheet.order-sheet .facts { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1px 9px; margin-top: 5px; }
  .sheet.order-sheet .fact { min-width: 0; }
  .sheet.order-sheet .k { display: block; font-size: 6.5px; line-height: 1.2; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5a7a5a; }
  .sheet.order-sheet .v { display: block; font-size: 10px; line-height: 1.2; overflow-wrap: anywhere; }

  .sheet.order-sheet table { table-layout: fixed; margin-top: 5px; }
  .sheet.order-sheet th { padding: 2.5px 5px; font-size: 7.5px; line-height: 1.2; }
  .sheet.order-sheet td { padding: 2.5px 5px; font-size: 10px; line-height: 1.2; border-bottom-color: #eef1ea; vertical-align: top; }
  .sheet.order-sheet td.item { overflow-wrap: anywhere; }
  .sheet.order-sheet .pack { color: #3f6b3f; font-size: 8px; line-height: 1.15; }
  .sheet.order-sheet .empty { padding: 10px 5px; }

  /* Totals and the customer note share a row, so a long note no longer pushes the
     signature block down the page. */
  .sheet.order-sheet .foot { display: flex; align-items: flex-start; gap: 8mm; margin-top: 5px; }
  .sheet.order-sheet .totals { width: 56mm; flex: 0 0 auto; }
  .sheet.order-sheet .totals div { padding: 1px 0; font-size: 10px; line-height: 1.2; }
  .sheet.order-sheet .totals .grand { margin-top: 2px; padding-top: 3px; font-size: 11.5px; }
  .sheet.order-sheet .notes { flex: 1 1 auto; min-width: 0; margin-top: 0; padding: 4px 7px; }
  .sheet.order-sheet .notes h2 { margin-bottom: 1px; font-size: 7.5px; line-height: 1.2; }
  .sheet.order-sheet .notes p { font-size: 9.5px; line-height: 1.25; }
  .sheet.order-sheet .signoff { margin-top: 8px; }
  .sheet.order-sheet .signoff div { padding-top: 2px; font-size: 8px; }
  .sheet.order-sheet footer { margin-top: 5px; padding-top: 3px; font-size: 7.5px; line-height: 1.2; }

  /* More lines than a page holds comfortably: tighten the rhythm rather than drop
     anything. Each tier only scales the whitespace and the small print; the line
     items, their quantities and their amounts are never reduced or hidden. */
  .sheet.order-sheet--dense .masthead h1 { font-size: 14px; }
  .sheet.order-sheet--dense .v { font-size: 9.5px; }
  .sheet.order-sheet--dense th { padding: 2px 4px; font-size: 7px; }
  .sheet.order-sheet--dense td { padding: 2px 4px; font-size: 9.5px; }
  .sheet.order-sheet--dense .pack { font-size: 7.5px; }

  .sheet.order-sheet--tight .masthead { padding-bottom: 3px; }
  .sheet.order-sheet--tight .masthead h1 { font-size: 13px; }
  .sheet.order-sheet--tight .masthead p { font-size: 8px; }
  .sheet.order-sheet--tight .facts { gap: 0 8px; margin-top: 4px; }
  .sheet.order-sheet--tight .k { font-size: 6px; }
  .sheet.order-sheet--tight .v { font-size: 9px; line-height: 1.15; }
  .sheet.order-sheet--tight table { margin-top: 4px; }
  .sheet.order-sheet--tight th { padding: 1.8px 4px; font-size: 6.5px; }
  .sheet.order-sheet--tight td { padding: 1.5px 4px; font-size: 9px; line-height: 1.15; }
  .sheet.order-sheet--tight .pack { font-size: 7.5px; }
  .sheet.order-sheet--tight .totals div { padding: 0.5px 0; font-size: 9.5px; }
  .sheet.order-sheet--tight .signoff { margin-top: 6px; }
  .sheet.order-sheet--tight .notes { padding: 3px 6px; }
  .sheet.order-sheet--tight .notes p { font-size: 9px; }
  .sheet.order-sheet--tight footer { margin-top: 4px; padding-top: 2px; font-size: 7px; }

  /* A very large wholesale order. Even here the item text stays at 9px, which is
     still comfortably readable on paper; only the surrounding whitespace goes. */
  .sheet.order-sheet--micro .masthead h1 { font-size: 12px; }
  .sheet.order-sheet--micro .masthead p { font-size: 7.5px; }
  .sheet.order-sheet--micro .title { font-size: 9.5px; }
  .sheet.order-sheet--micro .facts { gap: 0 7px; margin-top: 3px; }
  .sheet.order-sheet--micro .v { font-size: 8.5px; line-height: 1.1; }
  .sheet.order-sheet--micro table { margin-top: 3px; }
  .sheet.order-sheet--micro th { padding: 1.4px 3px; font-size: 6px; }
  .sheet.order-sheet--micro td { padding: 1px 3px; font-size: 9px; line-height: 1.1; }
  .sheet.order-sheet--micro .pack { font-size: 7.5px; line-height: 1.05; }
  .sheet.order-sheet--micro .foot { margin-top: 3px; gap: 6mm; }
  .sheet.order-sheet--micro .totals { width: 52mm; }
  .sheet.order-sheet--micro .totals div { padding: 0 0; font-size: 9px; line-height: 1.15; }
  .sheet.order-sheet--micro .totals .grand { margin-top: 1px; padding-top: 2px; font-size: 10.5px; }
  .sheet.order-sheet--micro .notes { padding: 2px 5px; }
  .sheet.order-sheet--micro .notes p { font-size: 8.5px; line-height: 1.15; }
  .sheet.order-sheet--micro .signoff { margin-top: 5px; }
  .sheet.order-sheet--micro footer { margin-top: 3px; padding-top: 2px; font-size: 7px; }

  @media print {
    .sheet.order-sheet { max-width: none; }
    /* The shared styles keep a whole table on one page, which is right for the order
       list and the reports. A long order table has to be allowed to flow, or the
       browser shoves the entire table onto a page of its own and everything spills
       further than it needs to. Individual rows are still kept whole below. */
    .sheet.order-sheet table { page-break-inside: auto; break-inside: auto; }
    /* A row is never split across a page boundary, and the header repeats if the
       table is long enough to spill, so no line item is ever cut in half. */
    .sheet.order-sheet tr { page-break-inside: avoid; break-inside: avoid; }
    .sheet.order-sheet thead { display: table-header-group; }
    .sheet.order-sheet .masthead, .sheet.order-sheet .facts, .sheet.order-sheet .totals, .sheet.order-sheet .notes, .sheet.order-sheet .signoff { page-break-inside: avoid; break-inside: avoid; }
  }
`;

const printScript = `
  window.addEventListener('load', function () {
    if (new URLSearchParams(window.location.search).get('auto') === '0') return;
    setTimeout(function () { window.focus(); window.print(); }, 400);
  });
`;

/**
 * `sheet` names a specialised layout. `order-sheet` pulls in the compact A4 rules and
 * the density class that `orderDocumentBody` picked for the number of line items, so
 * the print view and the Word file come from the same markup and cannot disagree.
 */
const buildDocument = (title, bodyHtml, { word = false, toolbar = false, wide = false, sheet = '' } = {}) => {
  const wordHead = word
    ? '<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>'
    : '';
  const namespaces = word
    ? 'xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"'
    : '';
  const isOrderSheet = sheet.startsWith('order-sheet');
  // The order sheet declares its own A4 portrait page size, which is the size a shop
  // order is actually printed on. Word ignores @page in a web view, so the order sheet
  // keeps portrait here and the list and report sheets stay landscape.
  const pageSetup = isOrderSheet ? '' : word ? '@page { size: A4 landscape; margin: 1.2cm; }' : '';
  const sheetClass = ['sheet', wide ? 'wide' : '', sheet].filter(Boolean).join(' ');

  return `<!DOCTYPE html>
<html ${namespaces}>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" />
<!--[if gte mso 9]>${wordHead}<![endif]-->
<style>${pageSetup}${documentStyles}${isOrderSheet ? orderSheetStyles : ''}</style>
</head>
<body>
${toolbar ? `<div class="toolbar"><button type="button" onclick="window.print()">Print or Save as PDF</button><p>Choose &quot;Save as PDF&quot; as the destination in the print dialog.</p></div>` : ''}
<div class="${sheetClass}">${bodyHtml}</div>
${word ? '' : `<script>${printScript}</script>`}
</body>
</html>`;
};

const printViaHiddenFrame = (html) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  frame.contentDocument.open();
  frame.contentDocument.write(html);
  frame.contentDocument.close();
  frame.contentWindow.addEventListener('load', () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  });
  setTimeout(() => frame.remove(), 60000);
};

/** Opens the print view; the operator picks "Save as PDF" in the print dialog. */
export const printDocument = (title, bodyHtml, { wide = false, sheet = '' } = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const html = buildDocument(title, bodyHtml, { toolbar: true, wide, sheet });
  const printWindow = window.open('', '_blank', 'width=980,height=1200');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    return true;
  }
  printViaHiddenFrame(html);
  return true;
};

export const downloadWordDocument = (title, fileName, bodyHtml, { wide = false, sheet = '' } = {}) => {
  if (typeof document === 'undefined') return false;
  const html = buildDocument(title, bodyHtml, { word: true, wide, sheet });
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' });
  return downloadBlob(blob, `${fileName}.doc`);
};

export const downloadBlob = (blob, fileName) => {
  if (typeof document === 'undefined') return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName(fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
};

/* ------------------------------------------------------------------- sheets */

/**
 * SpreadsheetML 2003 (.xls). Excel, LibreOffice and Google Sheets all open this
 * natively, which keeps the panel dependency-free while still giving a real
 * spreadsheet with a header row, typed cells and a totals row.
 */
export const downloadExcel = (fileName, sheets) => {
  if (typeof document === 'undefined') return false;
  const list = Array.isArray(sheets) ? sheets : [sheets];
  const worksheet = (sheet) => {
    const header = sheet.columns.map((column) => `<Cell ss:StyleID="head"><Data ss:Type="String">${escapeHtml(column.label)}</Data></Cell>`).join('');
    const body = sheet.rows
      .map((row) => {
        const cells = sheet.columns
          .map((column) => {
            const value = row[column.key];
            const type = typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${type === 'Number' ? value : escapeHtml(value)}</Data></Cell>`;
          })
          .join('');
        return `<Row>${cells}</Row>`;
      })
      .join('');
    const totals = sheet.totals
      ? `<Row>${sheet.columns
          .map((column, index) => {
            const total = sheet.totals[index];
            if (total === undefined) return '<Cell/>';
            const type = typeof total === 'number' ? 'Number' : 'String';
            return `<Cell ss:StyleID="total"><Data ss:Type="${type}">${type === 'Number' ? total : escapeHtml(total)}</Data></Cell>`;
          })
          .join('')}</Row>`
      : '';
    return `<Worksheet ss:Name="${escapeHtml(sheet.name || 'Sheet1')}"><Table>
<Row>${header}</Row>
${body}
${totals}
</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
  };

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="head"><Font ss:Bold="1"/><Interior ss:Color="#F2F7F0" ss:Pattern="Solid"/></Style>
 <Style ss:ID="total"><Font ss:Bold="1"/></Style>
</Styles>
${list.map(worksheet).join('\n')}
</Workbook>`;

  return downloadBlob(new Blob([`\ufeff${xml}`], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${fileName}.xls`);
};

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const downloadCsv = (fileName, columns, rows) => {
  if (typeof document === 'undefined') return false;
  const head = columns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(',')).join('\r\n');
  return downloadBlob(new Blob([`\ufeff${head}\r\n${body}`], { type: 'text/csv;charset=utf-8' }), `${fileName}.csv`);
};

/* ------------------------------------------------------------------- orders */

/**
 * Fixed column widths for the printed sheet, in percent. `table-layout: fixed` means a
 * long product name wraps inside the item column rather than pushing the money columns
 * off the right edge of the page. `#` is narrow, the money columns are sized to the
 * widest realistic rupee amount, and the item column takes whatever is left.
 */
const orderSheetColumns = ['4%', '52%', '8%', '10%', '12%', '14%'];

/**
 * How tightly the sheet is set. A normal enquiry is a handful of lines, so it gets the
 * comfortable base rhythm. A wholesale order can run to dozens of lines, and rather than
 * spill onto extra pages the spacing steps down a tier at a time. The tiers were set by
 * printing real orders at each size and counting pages: up to about thirty lines still
 * land on a single A4 sheet, and a forty line order is the point where a second page
 * becomes unavoidable, so it prints in full across two rather than being trimmed.
 *
 * Nothing is ever dropped to force a fit.
 */
export const orderSheetDensity = (itemCount) => {
  if (itemCount > 30) return 'order-sheet--micro';
  if (itemCount > 18) return 'order-sheet--tight';
  if (itemCount > 7) return 'order-sheet--dense';
  return '';
};

const orderSheetColGroup = () => `<colgroup>${orderSheetColumns.map((width) => `<col style="width:${width}" />`).join('')}</colgroup>`;

const orderLineRows = (order) =>
  (order.items || [])
    .map(
      (line, index) => `<tr>
        <td class="num muted">${index + 1}</td>
        <td class="item"><strong>${escapeHtml(line.name)}</strong><div class="pack">${escapeHtml(line.kind === 'Product' ? line.category || 'Catalog item' : `${line.kind} · ${line.category || 'Catalog item'}`)}</div></td>
        <td class="muted">${escapeHtml(line.packSize || '1 Box')}</td>
        <td class="num">${Number(line.quantity) || 0}</td>
        <td class="num">${formatCurrency(line.unitPrice)}</td>
        <td class="num"><strong>${formatCurrency(line.lineTotal)}</strong></td>
      </tr>`,
    )
    .join('');

/** One label/value pair in the facts grid. `span` is how many of the six grid columns it takes. */
const fact = (label, value, span = 1) =>
  `<div class="fact" style="grid-column:span ${span}"><span class="k">${escapeHtml(label)}</span><span class="v">${value}</span></div>`;

export const orderDocumentBody = (order, business) => {
  const customer = order.customer || {};
  const address = [customer.address, [customer.city, customer.pin].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
  const notes = order.notes ? `<section class="notes"><h2>Customer note</h2><p>${escapeHtml(order.notes)}</p></section>` : '';
  const discountRow = order.totals.discount ? `<div><span>Discount</span><span>- ${formatCurrency(order.totals.discount)}</span></div>` : '';
  const deliveryRow = order.totals.delivery ? `<div><span>Delivery</span><span>${formatCurrency(order.totals.delivery)}</span></div>` : '';
  const dueRow = outstandingAmount(order) ? `<div><span>Balance due</span><span>${formatCurrency(outstandingAmount(order))}</span></div>` : '';

  return `<header class="masthead">
        <div>
          <h1>${escapeHtml(businessName(business))}</h1>
          <p>${escapeHtml(businessLines(business) || 'Order sheet')}</p>
        </div>
        <div style="text-align:right">
          <p class="title">Order sheet</p>
          <span class="status">${escapeHtml(order.status)} · ${escapeHtml(order.paymentStatus)}</span>
        </div>
      </header>

      <div class="facts">
        ${fact('Customer', `<strong>${escapeHtml(customer.name || 'Not recorded')}</strong>`, 2)}
        ${fact('Phone', escapeHtml(customer.mobile || 'Not recorded'))}
        ${fact('Email', escapeHtml(customer.email || 'Not recorded'), 2)}
        ${fact('Order ID', `<strong>${escapeHtml(order.reference)}</strong>`)}
        ${fact('Invoice', escapeHtml(order.invoiceNumber || 'Not issued'))}
        ${fact('Order date', escapeHtml(readableDate(order.createdAt)))}
        ${fact('Status', `${escapeHtml(order.status)} · ${escapeHtml(order.paymentStatus)}`, 2)}
        ${fact('Channel', escapeHtml(order.channel || 'Storefront enquiry'))}
        ${fact('Occasion', escapeHtml(customer.occasion || 'Not given'))}
        ${fact('Payment mode', escapeHtml(order.paymentMode || 'Enquiry - confirm by phone'), 2)}
        ${fact('Address', escapeHtml(address || 'Not recorded'), 6)}
      </div>

      <table cellpadding="6" cellspacing="0" border="0">
        ${orderSheetColGroup()}
        <thead>
          <tr><th class="num">#</th><th>Item</th><th>Pack</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>${orderLineRows(order) || '<tr><td colspan="6" class="muted empty">No items recorded on this order.</td></tr>'}</tbody>
      </table>

      <div class="foot">
        <div class="totals">
          <div><span>Items (${orderUnitCount(order)} units)</span><span>${formatCurrency(order.totals.itemsTotal)}</span></div>
          ${deliveryRow}
          ${discountRow}
          <div class="grand"><span>Order total</span><span>${formatCurrency(order.totals.grandTotal)}</span></div>
          ${dueRow}
        </div>
        ${notes}
      </div>

      <div class="signoff">
        <div>Customer signature</div>
        <div>For ${escapeHtml(businessName(business))}</div>
      </div>

      <footer>Rates shown are catalog NET RAT values. Final price, packing and availability are confirmed by phone before dispatch.</footer>`;
};

const orderSheet = (order) => `order-sheet ${orderSheetDensity((order.items || []).length)}`.trim();

/** The full print document for an order, exposed so the layout can be asserted in tests. */
export const buildPrintDocument = (order, business) =>
  buildDocument(`${order.reference} - ${businessName(business)}`, orderDocumentBody(order, business), { toolbar: true, sheet: orderSheet(order) });

export const printOrderDocument = (order, business) => printDocument(`${order.reference} - ${businessName(business)}`, orderDocumentBody(order, business), { sheet: orderSheet(order) });

export const downloadOrderWord = (order, business) =>
  downloadWordDocument(`${order.reference} - ${businessName(business)}`, `Anish-Enterprises-${order.reference}`, orderDocumentBody(order, business), {
    sheet: orderSheet(order),
  });

export const downloadOrderExcel = (order) =>
  downloadExcel(`Anish-Enterprises-${order.reference}`, {
    name: 'Order',
    columns: [
      { key: 'index', label: '#' },
      { key: 'code', label: 'Product code' },
      { key: 'name', label: 'Item' },
      { key: 'category', label: 'Category' },
      { key: 'kind', label: 'Kind' },
      { key: 'packSize', label: 'Pack size' },
      { key: 'quantity', label: 'Qty' },
      { key: 'unitPrice', label: 'Rate' },
      { key: 'lineTotal', label: 'Amount' },
    ],
    rows: (order.items || []).map((line, index) => ({
      index: index + 1,
      code: line.code || '',
      name: line.name,
      category: line.category,
      kind: line.kind,
      packSize: line.packSize,
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      lineTotal: Number(line.lineTotal) || 0,
    })),
    totals: ['', '', 'Order total', '', '', '', '', '', Number(order.totals.grandTotal) || 0],
  });

export const orderExportLabel = (order) => `${order.reference} - ${fileSafeDate()}`;

/* --------------------------------------------------------------- order lists */

export const orderListColumns = [
  { key: 'reference', label: 'Reference' },
  { key: 'createdAt', label: 'Date' },
  { key: 'customer', label: 'Customer' },
  { key: 'mobile', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
  { key: 'paymentStatus', label: 'Payment' },
  { key: 'channel', label: 'Channel' },
  { key: 'items', label: 'Items' },
  { key: 'units', label: 'Units' },
  { key: 'itemsTotal', label: 'Items total' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'discount', label: 'Discount' },
  { key: 'grandTotal', label: 'Order total' },
  { key: 'paidAmount', label: 'Paid' },
  { key: 'due', label: 'Balance due' },
];

export const orderListRow = (order) => ({
  reference: order.reference,
  createdAt: readableDay(order.createdAt),
  customer: order.customer?.name || '',
  mobile: order.customer?.mobile || '',
  city: order.customer?.city || '',
  status: order.status,
  paymentStatus: order.paymentStatus,
  channel: order.channel,
  items: (order.items || []).map((line) => line.name).join('; '),
  units: orderUnitCount(order),
  itemsTotal: Number(order.totals?.itemsTotal) || 0,
  delivery: Number(order.totals?.delivery) || 0,
  discount: Number(order.totals?.discount) || 0,
  grandTotal: Number(order.totals?.grandTotal) || 0,
  paidAmount: Number(order.paidAmount) || 0,
  due: outstandingAmount(order),
});

export const orderListRows = (orders) => (orders || []).map(orderListRow);

export const downloadOrdersExcel = (orders, label = 'orders') => {
  const rows = orderListRows(orders);
  return downloadExcel(`Anish-Enterprises-${label}-${fileSafeDate()}`, {
    name: 'Orders',
    columns: orderListColumns,
    rows,
    totals: [
      'Total', '', '', '', '', '', '', '',
      rows.reduce((sum, row) => sum + row.units, 0),
      round(rows.reduce((sum, row) => sum + row.itemsTotal, 0)),
      round(rows.reduce((sum, row) => sum + row.delivery, 0)),
      round(rows.reduce((sum, row) => sum + row.discount, 0)),
      round(rows.reduce((sum, row) => sum + row.grandTotal, 0)),
      round(rows.reduce((sum, row) => sum + row.paidAmount, 0)),
      round(rows.reduce((sum, row) => sum + row.due, 0)),
    ],
  });
};

export const downloadOrdersCsv = (orders, label = 'orders') =>
  downloadCsv(`Anish-Enterprises-${label}-${fileSafeDate()}`, orderListColumns, orderListRows(orders));

export const ordersDocumentBody = (orders, { title, subtitle, stats, business }) => {
  const rows = (orders || [])
    .map(
      (order) => `<tr>
      <td><strong>${escapeHtml(order.reference)}</strong><div class="muted">${escapeHtml(order.invoiceNumber || '')}</div></td>
      <td>${escapeHtml(readableDay(order.createdAt))}</td>
      <td>${escapeHtml(order.customer?.name || 'Not recorded')}<div class="muted">${escapeHtml(order.customer?.mobile || '')}</div></td>
      <td>${escapeHtml(order.customer?.city || '')}</td>
      <td>${escapeHtml(order.status)}</td>
      <td>${escapeHtml(order.paymentStatus)}</td>
      <td class="num">${orderUnitCount(order)}</td>
      <td class="num"><strong>${formatCurrency(order.totals.grandTotal)}</strong></td>
      <td class="num">${formatCurrency(outstandingAmount(order))}</td>
    </tr>`,
    )
    .join('');

  const cards = (stats || [])
    .map((stat) => `<div class="block"><h2>${escapeHtml(stat.label)}</h2><p style="font-size:18px;font-weight:700">${escapeHtml(stat.value)}</p></div>`)
    .join('');

  return `<header class="masthead">
        <div>
          <h1>${escapeHtml(businessName(business))}</h1>
          <p>${escapeHtml(businessLines(business) || 'Order management')}</p>
        </div>
        <div style="text-align:right"><p class="title">${escapeHtml(title)}</p></div>
      </header>
      ${subtitle ? `<p class="muted" style="margin:12px 0 0">${escapeHtml(subtitle)}</p>` : ''}
      ${cards ? `<div class="grid">${cards}</div>` : ''}
      <h3 class="section">Orders</h3>
      <table cellpadding="6" cellspacing="0" border="0">
        <thead><tr><th>Reference</th><th>Date</th><th>Customer</th><th>City</th><th>Status</th><th>Payment</th><th class="num">Units</th><th class="num">Total</th><th class="num">Due</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="muted">No orders in this range.</td></tr>'}</tbody>
      </table>
      <footer>Generated ${escapeHtml(readableDate(new Date()))} from live order records.</footer>`;
};

export const printOrdersDocument = (orders, options) =>
  printDocument(options?.title || 'Orders', ordersDocumentBody(orders, options), { wide: true });

export const downloadOrdersWord = (orders, options) =>
  downloadWordDocument(options?.title || 'Orders', `Anish-Enterprises-${options?.fileLabel || 'orders'}-${fileSafeDate()}`, ordersDocumentBody(orders, options), { wide: true });

/* ------------------------------------------------------------------ reports */

/**
 * A report is a list of sections; the same section list drives the printed sheet, the
 * Word file and the workbook, so an exported report can never disagree with the page.
 */
const reportSectionHtml = (section) => {
  const head = section.columns.map((column) => `<th class="${column.align === 'right' ? 'num' : ''}">${escapeHtml(column.label)}</th>`).join('');
  const body = (section.rows || [])
    .map(
      (row) =>
        `<tr>${section.columns
          .map((column) => {
            const value = row[column.key];
            const text = column.align === 'right' && typeof value === 'number' ? formatCurrency(value) : value;
            return `<td class="${column.align === 'right' ? 'num' : ''}">${escapeHtml(text)}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');
  const foot = section.totals
    ? `<tfoot><tr>${section.columns
        .map((column, index) => {
          const value = section.totals[index];
          if (value === undefined) return '<td></td>';
          return `<td class="${column.align === 'right' ? 'num' : ''}"><strong>${escapeHtml(typeof value === 'number' ? formatCurrency(value) : value)}</strong></td>`;
        })
        .join('')}</tr></tfoot>`
    : '';
  if (!section.rows || !section.rows.length) {
    return `<h3 class="section">${escapeHtml(section.heading)}</h3><p class="muted">No data in this range.</p>`;
  }
  return `<h3 class="section">${escapeHtml(section.heading)}</h3>
  <table cellpadding="6" cellspacing="0" border="0">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
    ${foot}
  </table>`;
};

export const reportDocumentBody = ({ title, subtitle, stats = [], sections = [], business, note }) => {
  const cards = stats
    .map((stat) => `<div class="block"><h2>${escapeHtml(stat.label)}</h2><p style="font-size:18px;font-weight:700">${escapeHtml(stat.value)}</p></div>`)
    .join('');
  return `<header class="masthead">
        <div>
          <h1>${escapeHtml(businessName(business))}</h1>
          <p>${escapeHtml(businessLines(business) || 'Sales report')}</p>
        </div>
        <div style="text-align:right"><p class="title">${escapeHtml(title)}</p></div>
      </header>
      ${subtitle ? `<p class="muted" style="margin:12px 0 0">${escapeHtml(subtitle)}</p>` : ''}
      ${cards ? `<div class="grid">${cards}</div>` : ''}
      ${sections.map(reportSectionHtml).join('')}
      <footer>${escapeHtml(note || 'Generated from live order records.')}</footer>`;
};

export const printReportDocument = (report) => printDocument(report.title, reportDocumentBody(report), { wide: true });

export const downloadReportWord = (report) =>
  downloadWordDocument(report.title, `Anish-Enterprises-${report.fileLabel || 'report'}-${fileSafeDate()}`, reportDocumentBody(report), { wide: true });

export const downloadReportExcel = (report) => {
  const summary = {
    name: 'Summary',
    columns: [
      { key: 'label', label: 'Measure' },
      { key: 'value', label: 'Value' },
    ],
    rows: (report.stats || []).map((stat) => ({ label: stat.label, value: stat.value })),
  };
  return downloadExcel(`Anish-Enterprises-${report.fileLabel || 'report'}-${fileSafeDate()}`, [summary, ...(report.sections || [])]);
};

export const downloadReportCsv = (report) => {
  const section = (report.sections || [])[0];
  if (!section) return downloadCsv(`Anish-Enterprises-${report.fileLabel || 'report'}-${fileSafeDate()}`, [{ key: 'label', label: 'Measure' }], []);
  return downloadCsv(`Anish-Enterprises-${report.fileLabel || 'report'}-${fileSafeDate()}`, section.columns, section.rows);
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
