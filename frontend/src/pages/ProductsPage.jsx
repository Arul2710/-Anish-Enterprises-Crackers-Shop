import { ProductCatalog } from '../components/catalog/ProductCatalog';
import { useSeo } from '../hooks/useSeo';

export function ProductsPage() {
  useSeo({
    title: 'All crackers products | Anish Enterprises',
    description:
      'Browse every wholesale crackers listing from Anish Enterprises, Sivakasi: Deepavali rockets, sparklers, fancy chakkars, flower pots and gift box packs at wholesale rates.',
    path: '/products',
  });

  return <ProductCatalog />;
}
