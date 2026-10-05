import assert from 'node:assert/strict';

const downloads = [];
const opened = [];
const pending = [];

globalThis.window = {
  open: (...args) => {
    opened.push(args);
    return { document: { open() {}, write() {}, close() {} }, focus() {}, print() {}, close() {} };
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
globalThis.document = {
  createElement: () => {
    const element = {
      style: {},
      setAttribute() {},
      appendChild() {},
      remove() {},
      // Each click ends one export, so the markup handed to the URL is paired with
      // the file name the browser was asked to save it under.
      click() {
        downloads.push({ file: element.download, html: pending.pop() || '' });
      },
    };
    return element;
  },
  body: { appendChild() {}, removeChild() {} },
};
globalThis.Blob = class {
  constructor(parts) {
    this.parts = parts;
    this.text = parts.join('');
  }
};
globalThis.URL = class {
  static createObjectURL(blob) {
    pending.push(blob.text);
    return 'blob:test';
  }
  static revokeObjectURL() {}
};
globalThis.URLSearchParams = URLSearchParams;
const store = new Map();
globalThis.window.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const documents = await import('../src/utils/documents.js');
const { writeStorage } = await import('../src/utils/storage.js');
const { seedProductRecords, seedCategoryRecords } = await import('../src/data/productRecords.js');
const orders = await import('../src/services/orders.js');
const { buildCatalog } = await import('../src/data/catalog.js');
const { comboTiles } = await import('../src/data/comboGift.js');

const products = seedProductRecords();
const catalog = buildCatalog(products, seedCategoryRecords());
orders.setOrderCatalogLookup(catalog.getCatalogProduct, (id) => comboTiles.find((tile) => tile.id === id));

writeStorage(orders.orderStorageKey, []);
const one = orders.createOrder({
  customer: { name: 'Anita', mobile: '9000000010', email: 'anita@example.com', address: '12 Mill Street', city: 'Rajapalayam', pin: '626101' },
  items: [orders.catalogLine(products[0].id, 2), orders.comboLine(comboTiles[1].id, 1)],
  deliveryFee: 60,
  notes: 'Please call before delivery',
});
const two = orders.createOrder({ customer: { name: 'Bala', mobile: '9000000011', city: 'Sivakasi' }, items: [orders.catalogLine(products[1].id, 1)] });
orders.updateOrderStatus(two.reference, 'Delivered', 'Delivered by hand');
orders.updateOrderPayment(two.reference, { paidAmount: two.totals.grandTotal, paymentStatus: 'Paid' });

const list = orders.listOrders();
const business = { businessName: 'Anish Enterprises', address: 'Kamak Road', city: '', state: '', phone: '9442521144', email: 'anishenterprisessvk@gmail.com' };
const customers = orders.listCustomers(list);
const report = {
  title: 'Sales report',
  fileLabel: 'sales-report-30d',
  subtitle: 'Last 30 days - 2 orders',
  stats: [{ label: 'Orders', value: '2' }, { label: 'Order value', value: 'Rs. 1,000' }],
  business,
  sections: [
    {
      heading: 'Daily sales',
      columns: [{ key: 'date', label: 'Date' }, { key: 'revenue', label: 'Value', align: 'right' }],
      rows: [{ date: '2026-01-01', revenue: 500 }, { date: '2026-01-02', revenue: 500 }],
      totals: ['Total', 1000],
    },
  ],
  note: 'Cancelled and refunded orders are excluded.',
};

const results = [];
const check = (name, run) => {
  try {
    run();
    results.push(`PASS  ${name}`);
  } catch (error) {
    results.push(`FAIL  ${name}: ${error.message}`);
  }
};

const htmlFor = (file) => downloads.filter((entry) => entry.file === file).at(-1)?.html || '';
const lastFile = () => downloads.at(-1)?.file || '';
const fileNamed = (suffix) => downloads.some((entry) => entry.file.endsWith(suffix));
const listOptions = { title: 'Orders', fileLabel: 'orders', subtitle: 'All orders', business };

check('an order sheet can be printed', () => {
  documents.printOrderDocument(one, business);
  assert.equal(opened.length, 1, 'a print window is opened');
  assert.equal(opened[0][1], '_blank', 'the sheet opens in a new tab');
  assert.ok(opened[0][2].includes('width'), 'the sheet opens at a readable size');
});

check('the printed order sheet is laid out for a single A4 page', () => {
  const markup = documents.buildPrintDocument(one, business);
  assert.ok(markup.includes('@page { size: A4 portrait'), 'the sheet declares an A4 portrait page size');
  assert.ok(markup.includes('sheet order-sheet'), 'the compact sheet layout is applied');
  // Fixed columns plus table-layout:fixed is what keeps a long product name inside
  // the table instead of pushing the totals off the page.
  assert.ok(markup.includes('table-layout: fixed'), 'the item table cannot grow past the page width');
  assert.ok(markup.includes('<colgroup>'), 'the columns have fixed widths');
  // Rows must not be split across a page boundary.
  assert.ok(markup.includes('break-inside: avoid'), 'table rows are kept whole on a page');
  // The facts grid replaces the three tall cards.
  assert.ok(markup.includes('class="facts"'), 'order details use a compact grid');
  assert.ok(!markup.includes('class="block"'), 'the tall detail cards are gone');
});

check('the sheet gets tighter as the order grows, without dropping any items', () => {
  const line = (index) => ({ name: `Item ${index}`, kind: 'Product', category: 'Sparks', packSize: '10 Boxes', quantity: 1, unitPrice: 100, lineTotal: 100 });
  const sized = (count) => documents.buildPrintDocument({ ...one, items: Array.from({ length: count }, (_, index) => line(index + 1)) }, business);

  const small = sized(3);
  assert.ok(small.includes('sheet order-sheet"'), 'a short order keeps the roomy base layout');
  assert.ok(sized(12).includes('order-sheet--dense'), 'a long order steps down one tier');
  assert.ok(sized(24).includes('order-sheet--tight'), 'a longer order tightens further');
  assert.ok(sized(45).includes('order-sheet--micro'), 'a very long order uses the tightest tier');

  const big = sized(45);
  for (let index = 1; index <= 45; index++) {
    assert.ok(big.includes(`Item ${index}`), `item ${index} is still printed`);
  }
  assert.ok(big.includes('Item 1') && big.includes('Item 45'), 'the first and last line both survive');
});

check('a long order table is allowed to flow instead of forcing a page of its own', () => {
  const markup = documents.buildPrintDocument(one, business);
  // The shared print rules keep a whole table on one page, which is right for the order
  // list and the reports. The order sheet has to override that, or a long table is
  // pushed onto a page of its own and the order spills further than it needs to.
  assert.ok(markup.includes('page-break-inside: auto'), 'a long item table may break between rows');
  assert.ok(markup.includes('display: table-header-group'), 'the column headings repeat on any continuation page');
  // Individual rows still stay whole.
  assert.ok(markup.includes('.sheet.order-sheet tr { page-break-inside: avoid'), 'a single row is never split across pages');
});

check('a very long product name wraps inside the item column', () => {
  const longName = 'Ultra Premium Long Handled Fountain Sky Rocket Blue Sparkler Collection Special Combo Pack';
  const markup = documents.buildPrintDocument(
    { ...one, items: [{ ...one.items[0], name: longName }] },
    business,
  );
  assert.ok(markup.includes(longName), 'the full product name is printed, not truncated');
  assert.ok(markup.includes('overflow-wrap: anywhere'), 'the name column is allowed to break long text');
  assert.ok(markup.includes('table-layout: fixed'), 'the money columns keep their width whatever the name length');
});

check('the printed sheet leads with the shop name and the key order details', () => {
  const markup = documents.buildPrintDocument(one, business);
  assert.ok(markup.includes('Anish Enterprises'), 'the shop name is present');
  assert.ok(markup.includes(one.reference), 'the order id is present');
  assert.ok(markup.includes('Order date'), 'the order date is labelled');
  assert.ok(markup.includes('Customer'), 'the customer is labelled');
  assert.ok(markup.includes('Anita'), 'the customer name is present');
  assert.ok(markup.includes(one.customer.mobile), 'the customer phone is present');
  assert.ok(markup.includes('Please call before delivery'), 'the customer note is still printed');
  assert.ok(markup.includes('Order total'), 'the order total is present');
  // The shop name is the most prominent text on the page.
  const heading = markup.match(/<h1>([^<]+)<\/h1>/);
  assert.ok(heading && heading[1].trim() === 'Anish Enterprises', 'the shop name is the document heading');
});

check('the order sheet carries the business, customer, items and totals', () => {
  documents.downloadOrderWord(one, business);
  const markup = htmlFor(lastFile());
  assert.ok(markup.includes('Anish Enterprises'), 'business name is present');
  assert.ok(markup.includes(one.reference), 'order reference is present');
  assert.ok(one.invoiceNumber && markup.includes(one.invoiceNumber), 'invoice number is present');
  assert.ok(markup.includes('Anita'), 'customer name is present');
  assert.ok(markup.includes('Please call before delivery'), 'the order note is present');
  assert.ok(markup.includes('Order total'), 'a total row is present');
  assert.ok(markup.includes(products[0].name), 'the product line is listed');
  assert.ok(markup.includes('2'), 'the quantity is shown');
});

check('an order spreadsheet is produced', () => {
  documents.downloadOrderExcel(one);
  assert.ok(fileNamed('.xls'), 'an .xls file is offered');
  assert.ok(htmlFor(lastFile()).includes('Item'), 'the sheet has a header row');
  assert.ok(htmlFor(lastFile()).includes(products[0].name), 'the product is on the sheet');
});

check('a full order list exports with a header row and every reference', () => {
  documents.downloadOrdersWord(list, listOptions);
  const markup = htmlFor(lastFile());
  assert.ok(markup.includes(one.reference) && markup.includes(two.reference), 'both orders are listed');
  documents.printOrdersDocument(list, listOptions);
  assert.equal(opened.length, 2, 'the list has its own print action');
  documents.downloadOrdersExcel(list, 'orders');
  documents.downloadOrdersCsv(list, 'orders');
  assert.ok(fileNamed('.csv'), 'a csv file is offered');
  assert.ok(fileNamed('.xls'), 'a workbook is offered');
});

check('the customer list exports with contact details', () => {
  // Customers are exported through the shared primitives, the same path the page uses.
  const columns = [
    { key: 'name', label: 'Customer' },
    { key: 'mobile', label: 'Phone' },
    { key: 'orders', label: 'Orders' },
    { key: 'revenue', label: 'Value' },
  ];
  documents.downloadCsv('customers', columns, customers);
  const csv = htmlFor(lastFile());
  assert.ok(csv.includes('Anita') && csv.includes('Bala'), 'both customers are listed');
  assert.ok(csv.includes('9000000010'), 'the phone number is included');
  documents.downloadExcel('customers', [{ name: 'Customers', columns, rows: customers }]);
  assert.ok(htmlFor(lastFile()).includes('Customer'), 'the workbook has a header row');
});

check('a report exports every section heading', () => {
  documents.downloadReportWord(report);
  const markup = htmlFor(lastFile());
  assert.ok(markup.includes('Sales report'), 'the title is present');
  assert.ok(markup.includes('Daily sales'), 'the section heading is present');
  assert.ok(markup.includes('2026-01-01'), 'a data row is present');
  documents.downloadReportExcel(report);
  documents.downloadReportCsv(report);
  documents.printReportDocument(report);
  assert.equal(opened.length, 3, 'the report opens its own print window');
});

check('every export escaped markup instead of injecting it', () => {
  const risky = orders.createOrder({
    customer: { name: '<script>alert(1)</script>', mobile: '9000000012' },
    items: [orders.catalogLine(products[2].id, 1)],
  });
  documents.downloadOrderWord(risky, business);
  const markup = htmlFor(lastFile());
  assert.ok(!markup.includes('<script>alert(1)</script>'), 'raw script tags never reach the document');
  assert.ok(markup.includes('&lt;script&gt;'), 'the name is escaped instead');
});

check('an export file name never breaks on a slash in the label', () => {
  documents.downloadReportWord({ ...report, fileLabel: 'mar/2026 sales' });
  assert.ok(!lastFile().includes('/'), `expected a safe file name, got ${lastFile()}`);
  assert.ok(lastFile().endsWith('.doc'), 'the extension is kept');
  assert.equal(documents.safeFileName('///'), 'export', 'a label with nothing usable falls back');
});

check('the order list columns line up with the rows', () => {
  const columns = documents.orderListColumns;
  const row = documents.orderListRow(one);
  assert.equal(columns.length, Object.keys(row).length, 'every column has a value');
  for (const column of columns) {
    assert.notEqual(row[column.key], undefined, `${column.key} is always filled in`);
  }
  assert.equal(documents.orderListRows(list).length, list.length, 'one row per order');
});

console.log(results.join('\n'));
const failed = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
