import { useContext } from 'react';
import { CatalogContext } from '../context/CatalogContextValue';

export const useCatalog = () => {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider.');
  return value;
};
