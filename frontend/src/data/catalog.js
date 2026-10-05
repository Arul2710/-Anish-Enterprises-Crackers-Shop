import { CODE_PREFIX, seedCategoryRecords, seedProductRecords } from './productRecords';
import { slugify } from '../utils/format';

export { CODE_PREFIX };

export const ALL_CATEGORIES = 'all';

export const sortOptions = [
  { value: 'catalog', label: 'Catalog Order' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'price-low', label: 'Indicative Price: Low to High' },
  { value: 'price-high', label: 'Indicative Price: High to Low' },
  { value: 'newest', label: 'Source Serial: Latest First' },
];

export const defaultSort = sortOptions[0].value;
export const getSortLabel = (value) => sortOptions.find((option) => option.value === value)?.label || sortOptions[0].label;

const comparators = {
  catalog: (first, second) => first.sourceSerial - second.sourceSerial,
  'name-asc': (first, second) => first.name.localeCompare(second.name) || first.sourceSerial - second.sourceSerial,
  'price-low': (first, second) => first.price - second.price || first.sourceSerial - second.sourceSerial,
  'price-high': (first, second) => second.price - first.price || first.sourceSerial - second.sourceSerial,
  newest: (first, second) => second.sourceSerial - first.sourceSerial,
};

const bySerial = (first, second) => (first.sourceSerial || 0) - (second.sourceSerial || 0);

/**
 * Builds every derived catalog value from the live product and category records.
 *
 * The storefront used to read a frozen module-scope array, which meant admin edits
 * could never reach it. Everything derived from the catalog now happens inside this
 * builder so the same records drive both the shop and the admin panel.
 */
export const buildCatalog = (productRecords = [], categoryRecords = []) => {
  const activeCategories = categoryRecords.filter((category) => category.active !== false);

  const counts = productRecords.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  const metaByCategory = new Map(
    activeCategories.map((category) => [
      category.name,
      {
        name: category.name,
        label: category.label || category.name,
        description: category.description || '',
        tone: category.tone || 'navy',
        image: category.image || '',
        active: category.active !== false,
        slug: category.slug || slugify(category.name),
        order: Number.isFinite(category.order) ? category.order : 0,
        count: counts[category.name] || 0,
      },
    ]),
  );

  const metaFor = (categoryName) =>
    metaByCategory.get(categoryName) || {
      name: categoryName,
      label: categoryName,
      description: '',
      tone: 'navy',
      image: '',
      active: true,
      slug: slugify(categoryName),
      order: 9999,
      count: 0,
    };

  const catalogCategories = activeCategories
    .map((category) => metaByCategory.get(category.name))
    .filter(Boolean)
    .sort((first, second) => first.order - second.order || first.name.localeCompare(second.name));

  const catalogProducts = productRecords
    .filter((product) => product.status !== 'inactive')
    .map((product, index) => {
      const mrp = Number(product.mrp) || 0;
      const price = Number(product.sellingPrice) || 0;
      const discountPercent = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
      const meta = metaFor(product.category);
      const code = product.code || `${CODE_PREFIX}-${String(product.sourceSerial || index + 1).padStart(3, '0')}`;

      return {
        ...product,
        code,
        mrp,
        price,
        discountPercent,
        savings: Math.max(0, mrp - price),
        hasDiscount: discountPercent > 0,
        categoryLabel: meta.label,
        categorySlug: meta.slug,
        categoryTone: meta.tone,
        isOutOfStock: product.stock === 0,
        searchIndex: [product.name, product.category, meta.label, product.packSize, product.code, product.sourceSerial]
          .join(' ')
          .toLowerCase(),
      };
    })
    .sort(bySerial);

  const catalogCategoriesWithCounts = catalogCategories.map((category) => ({
    ...category,
    count: catalogProducts.filter((product) => product.category === category.name).length,
  }));

  const categoryOptions = [
    { value: ALL_CATEGORIES, label: 'All Products', count: catalogProducts.length, tone: 'navy' },
    ...catalogCategoriesWithCounts.map((category) => ({
      value: category.name,
      label: category.label,
      count: category.count,
      tone: category.tone,
    })),
  ];

  const getCatalogProduct = (identifier) => {
    if (!identifier) return null;
    const needle = String(identifier).trim().toLowerCase();
    return (
      catalogProducts.find((product) => product.id.toLowerCase() === needle) ||
      catalogProducts.find((product) => String(product.code).toLowerCase() === needle) ||
      catalogProducts.find((product) => String(product.sourceSerial) === needle) ||
      null
    );
  };

  const getCatalogCategory = (identifier) => {
    if (!identifier) return null;
    const needle = String(identifier).trim().toLowerCase();
    return (
      catalogCategoriesWithCounts.find((category) => category.name.toLowerCase() === needle) ||
      catalogCategoriesWithCounts.find((category) => category.slug === needle) ||
      catalogCategoriesWithCounts.find((category) => category.label.toLowerCase() === needle) ||
      null
    );
  };

  const filterCatalog = ({ search = '', category = ALL_CATEGORIES } = {}) => {
    const needle = String(search).trim().toLowerCase();
    return catalogProducts.filter((product) => {
      const matchesCategory = category === ALL_CATEGORIES || product.category === category;
      const matchesSearch = !needle || product.searchIndex.includes(needle);
      return matchesCategory && matchesSearch;
    });
  };

  const sortCatalog = (list, sort) => [...list].sort(comparators[sort] || comparators.catalog);

  const sheetOrder = new Map(catalogCategoriesWithCounts.map((category, index) => [category.name, index]));

  const buildSections = (list, sort) => {
    const buckets = new Map();
    list.forEach((product) => {
      if (!buckets.has(product.category)) buckets.set(product.category, []);
      buckets.get(product.category).push(product);
    });

    const sections = [...buckets.entries()].map(([name, items]) => {
      const category = metaFor(name);
      const sorted = sortCatalog(items, sort);
      const prices = items.map((product) => product.price);
      return {
        key: category.slug,
        category,
        label: category.label,
        tone: category.tone,
        products: sorted,
        count: sorted.length,
        value: prices.reduce((total, price) => total + price, 0),
        floor: Math.min(...prices),
        ceiling: Math.max(...prices),
      };
    });

    if (sort === 'price-low') return sections.sort((a, b) => a.floor - b.floor || a.value - b.value);
    if (sort === 'price-high') return sections.sort((a, b) => b.ceiling - a.ceiling || b.value - a.value);
    return sections.sort((a, b) => (sheetOrder.get(a.category.name) ?? 0) - (sheetOrder.get(b.category.name) ?? 0));
  };

  return {
    catalogProducts,
    catalogCategories: catalogCategoriesWithCounts,
    categoryOptions,
    CATALOG_TOTAL: catalogProducts.length,
    getCatalogProduct,
    getCatalogCategory,
    filterCatalog,
    sortCatalog,
    buildSections,
  };
};

/**
 * Catalog derived from the supplied sheet alone.
 *
 * React reads the live catalog from CatalogContext instead. This frozen copy exists
 * for the one place that derives data outside the React tree: src/data/comboGift.js
 * turns it into the seeded Combo & Gift packs. Those packs store their own price and
 * MRP once created, so later admin price edits do not need to re-derive them.
 */
const seedCatalog = buildCatalog(seedProductRecords(), seedCategoryRecords());

export const catalogProducts = seedCatalog.catalogProducts;
export const catalogCategories = seedCatalog.catalogCategories;
