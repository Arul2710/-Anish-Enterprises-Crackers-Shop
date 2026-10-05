import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildCatalog } from '../data/catalog';
import { normalizeCategoryRecord, normalizeProductRecord, seedCategoryRecords, seedProductRecords } from '../data/productRecords';
import { RETIRED_PACK_IDS } from '../data/comboGift';
import { normalizePackRecord, packToTile, refreshStaleGiftBoxIdentity, seedPackRecords } from '../data/packRecords';
import { setOrderCatalogLookup } from '../services/orders';
import { slugify } from '../utils/format';
import { readStorage, writeStorage } from '../utils/storage';
import { CatalogContext } from './CatalogContextValue';

export const productStorageKey = 'spark-shine-products';
export const categoryStorageKey = 'spark-shine-categories';
export const packStorageKey = 'spark-shine-packs';

// Seeds only apply when nothing has been stored yet. An empty array is a deliberate
// choice made in the admin panel (every product removed), so it is respected instead
// of being replaced by the seed catalog on the next visit.
const readList = (key, fallback, normalize) => {
  const stored = readStorage(key, null);
  if (!Array.isArray(stored)) return fallback();
  return stored.map(normalize).filter(Boolean);
};

const readProducts = () => readList(productStorageKey, seedProductRecords, normalizeProductRecord);
const readCategories = () => readList(categoryStorageKey, seedCategoryRecords, normalizeCategoryRecord);

const readPacks = () =>
  refreshStaleGiftBoxIdentity(
    readList(packStorageKey, seedPackRecords, normalizePackRecord).filter((pack) => !RETIRED_PACK_IDS.has(pack.id)),
  );

/**
 * Single source of truth for the catalog.
 *
 * Products, categories and combo/gift packs all live here and persist to local
 * storage, so an edit made in the admin panel is immediately the same record the
 * storefront renders. The derived catalog (prices, codes, discount maths, category
 * counts, search index) is rebuilt from those records through buildCatalog, which is
 * why the shop and the panel can never disagree.
 */
export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(readProducts);
  const [categories, setCategories] = useState(readCategories);
  const [packs, setPacks] = useState(readPacks);

  useEffect(() => {
    writeStorage(productStorageKey, products);
  }, [products]);

  useEffect(() => {
    writeStorage(categoryStorageKey, categories);
  }, [categories]);

  useEffect(() => {
    writeStorage(packStorageKey, packs);
  }, [packs]);

  // Another tab (or a second window) changing the catalog updates this one too, so the
  // shop and the panel never show two different versions of the same records.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = (event) => {
      if (event.key === productStorageKey) setProducts(readProducts());
      if (event.key === categoryStorageKey) setCategories(readCategories());
      if (event.key === packStorageKey) setPacks(readPacks());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const catalog = useMemo(() => buildCatalog(products, categories), [products, categories]);
  const tiles = useMemo(() => packs.filter((pack) => pack.active).map(packToTile), [packs]);
  const allTiles = useMemo(() => packs.map(packToTile), [packs]);

  // An order line is priced from the same records the shop renders, so an admin price
  // change is reflected on any new enquiry while stored orders keep their own price.
  useEffect(() => {
    setOrderCatalogLookup(catalog.getCatalogProduct, (id) => allTiles.find((tile) => tile.id === id));
  }, [catalog, allTiles]);

  const addProduct = useCallback((draft) => {
    const record = normalizeProductRecord({ ...draft, id: undefined, code: undefined, source: 'manual', sourceSerial: nextManualSerial(products) });
    if (!record) throw new Error('A product needs a name and a category.');
    setProducts((current) => [record, ...current]);
    return record;
  }, [products]);

  const updateProduct = useCallback((id, patch) => {
    setProducts((current) =>
      current.map((product) => (product.id === id ? normalizeProductRecord({ ...product, ...patch, updatedAt: new Date().toISOString() }) : product)),
    );
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts((current) => current.filter((product) => product.id !== id));
  }, []);

  const setProductStatus = useCallback((id, status) => updateProduct(id, { status }), [updateProduct]);
  const setProductStock = useCallback((id, stock) => updateProduct(id, { stock }), [updateProduct]);

  const addCategory = useCallback((draft) => {
    const record = normalizeCategoryRecord({ ...draft, id: `cat-${slugify(draft.name)}`, order: categories.length }, categories.length);
    if (!record) throw new Error('A category needs a name.');
    setCategories((current) => [...current, record]);
    return record;
  }, [categories]);

  // A product stores its category by name, so renaming a category has to carry every
  // product across with it. Without this the products would be left pointing at a name
  // that no longer exists and would drop out of the shop listings.
  const updateCategory = useCallback((id, patch) => {
    setCategories((current) => {
      const target = current.find((category) => category.id === id);
      const next = current.map((category) => (category.id === id ? normalizeCategoryRecord({ ...category, ...patch, updatedAt: new Date().toISOString() }) : category));
      const nextName = next.find((category) => category.id === id)?.name;
      const previousName = target?.name;
      if (patch.name && previousName && nextName && previousName !== nextName) {
        setProducts((currentProducts) =>
          currentProducts.map((product) =>
            product.category === previousName
              ? normalizeProductRecord({ ...product, category: nextName, updatedAt: new Date().toISOString() })
              : product,
          ),
        );
      }
      return next;
    });
  }, []);

  const deleteCategory = useCallback((id) => {
    setCategories((current) => current.filter((category) => category.id !== id));
  }, []);

  const addPack = useCallback((draft) => {
    const record = normalizePackRecord({ ...draft, id: `pack-${Date.now().toString(36)}`, source: 'manual' });
    if (!record) throw new Error('A pack needs a name.');
    setPacks((current) => [record, ...current]);
    return record;
  }, []);

  const updatePack = useCallback((id, patch) => {
    setPacks((current) => current.map((pack) => (pack.id === id ? normalizePackRecord({ ...pack, ...patch, updatedAt: new Date().toISOString() }) : pack)));
  }, []);

  const deletePack = useCallback((id) => {
    setPacks((current) => current.filter((pack) => pack.id !== id));
  }, []);

  const setPackStatus = useCallback((id, active) => updatePack(id, { active }), [updatePack]);

  const resetCatalog = useCallback(() => {
    setProducts(seedProductRecords());
    setCategories(seedCategoryRecords());
  }, []);

  const resetPacks = useCallback(() => {
    setPacks(seedPackRecords());
  }, []);

  const value = useMemo(
    () => ({
      products,
      categories,
      packs,
      catalog,
      tiles,
      addProduct,
      updateProduct,
      deleteProduct,
      setProductStatus,
      setProductStock,
      addCategory,
      updateCategory,
      deleteCategory,
      addPack,
      updatePack,
      deletePack,
      setPackStatus,
      resetCatalog,
      resetPacks,
    }),
    [
      products, categories, packs, catalog, tiles,
      addProduct, updateProduct, deleteProduct, setProductStatus, setProductStock,
      addCategory, updateCategory, deleteCategory,
      addPack, updatePack, deletePack, setPackStatus,
      resetCatalog, resetPacks,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

const nextManualSerial = (products) => {
  const highest = products.reduce((max, product) => Math.max(max, Number(product.sourceSerial) || 0), 0);
  return highest + 1;
};
