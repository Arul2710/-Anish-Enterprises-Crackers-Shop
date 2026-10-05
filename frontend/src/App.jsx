import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { ContentProvider } from './context/ContentContext';
import { ScrollToTop } from './components/ScrollToTop';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ContentProvider>
        <CatalogProvider>
          <CartProvider>
            <ScrollToTop />
            <AppRoutes />
          </CartProvider>
        </CatalogProvider>
      </ContentProvider>
    </BrowserRouter>
  );
}
