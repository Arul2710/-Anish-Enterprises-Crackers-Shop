import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AdminCategoriesPage } from '../admin/AdminCategoriesPage';
import { AdminComboPacksPage } from '../admin/AdminComboPacksPage';
import { AdminContactPage } from '../admin/AdminContactPage';
import { AdminContentPage } from '../admin/AdminContentPage';
import { AdminCustomersPage } from '../admin/AdminCustomersPage';
import { AdminDashboardPage } from '../admin/AdminDashboardPage';
import { AdminEnquiriesPage } from '../admin/AdminEnquiriesPage';
import { AdminImportPage } from '../admin/AdminImportPage';
import { AdminInventoryPage } from '../admin/AdminInventoryPage';
import { AdminLayout } from '../admin/AdminLayout';
import { AdminLoginPage } from '../admin/AdminLoginPage';
import { AdminNotificationsPage } from '../admin/AdminNotificationsPage';
import { AdminOrdersPage } from '../admin/AdminOrdersPage';
import { AdminPaymentsPage } from '../admin/AdminPaymentsPage';
import { AdminProductsPage } from '../admin/AdminProductsPage';
import { AdminReportsPage } from '../admin/AdminReportsPage';
import { AdminSettingsPage } from '../admin/AdminSettingsPage';
import { AdminTestimonialsPage } from '../admin/AdminTestimonialsPage';
import { StoreLayout } from '../layouts/StoreLayout';
import { RequireAuth } from '../hooks/useAdminAuth';
import { useCatalog } from '../hooks/useCatalog';
import { AboutPage } from '../pages/AboutPage';
import { CartPage } from '../pages/CartPage';
import { ComboPacksPage } from '../pages/ComboPacksPage';
import { ContactPage } from '../pages/ContactPage';
import { EnquiryFormPage } from '../pages/EnquiryFormPage';
import { EnquirySuccessPage } from '../pages/EnquirySuccessPage';
import { FaqPage } from '../pages/FaqPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PolicyPage } from '../pages/PolicyPage';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { ReviewsPage } from '../pages/ReviewsPage';
import { SivakasiWholesalePage } from '../pages/SivakasiWholesalePage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailsPage />} />
        {/* The standalone categories page was removed; the old path now lands on the catalog. */}
        <Route path="categories" element={<Navigate to="/products" replace />} />
        <Route path="categories/:slug" element={<CategoryRedirect />} />
        <Route path="combo-packs" element={<ComboPacksPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="sivakasi-wholesale-crackers" element={<SivakasiWholesalePage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="privacy" element={<PolicyPage page="privacy" />} />
        <Route path="terms" element={<PolicyPage page="terms" />} />
        <Route path="safety" element={<PolicyPage page="safety" />} />
        {/* The enquiry list is now the cart; the old path still resolves. */}
        <Route path="enquiry" element={<Navigate to="/cart" replace />} />
        <Route path="enquiry/form" element={<EnquiryFormPage />} />
        <Route path="enquiry/success" element={<EnquirySuccessPage />} />
      </Route>
      <Route path="admin/login" element={<AdminLoginPage />} />
      {/* One guard wraps the whole panel: the shell is never rendered without a session,
          and each child adds its own permission so a role only reaches the screens it can use. */}
      <Route
        path="admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<RequireAuth permission="dashboard.view"><AdminDashboardPage /></RequireAuth>} />
        <Route path="products" element={<RequireAuth permission="products.view"><AdminProductsPage /></RequireAuth>} />
        <Route path="categories" element={<RequireAuth permission="categories.view"><AdminCategoriesPage /></RequireAuth>} />
        <Route path="combo-packs" element={<RequireAuth permission="packs.view"><AdminComboPacksPage /></RequireAuth>} />
        <Route path="orders" element={<RequireAuth permission="orders.view"><AdminOrdersPage /></RequireAuth>} />
        <Route path="customers" element={<RequireAuth permission="customers.view"><AdminCustomersPage /></RequireAuth>} />
        <Route path="payments" element={<RequireAuth permission="orders.view"><AdminPaymentsPage /></RequireAuth>} />
        <Route path="notifications" element={<RequireAuth permission="dashboard.view"><AdminNotificationsPage /></RequireAuth>} />
        <Route path="reports" element={<RequireAuth permission="reports.view"><AdminReportsPage /></RequireAuth>} />
        <Route path="contact" element={<RequireAuth permission="contact.edit"><AdminContactPage /></RequireAuth>} />
        <Route path="settings" element={<RequireAuth permission="settings.view"><AdminSettingsPage /></RequireAuth>} />
        <Route path="enquiries" element={<RequireAuth permission="orders.view"><AdminEnquiriesPage /></RequireAuth>} />
        <Route path="testimonials" element={<AdminTestimonialsPage />} />
        <Route path="content" element={<AdminContentPage />} />
        <Route path="inventory" element={<RequireAuth permission="products.view"><AdminInventoryPage /></RequireAuth>} />
        <Route path="import" element={<AdminImportPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/**
 * Categories are a view of the catalog rather than their own page, so a category
 * slug resolves to the products screen with that filter applied. Redirecting keeps
 * the state in the URL, so a refresh on the category path still lands on the right
 * listing and older shared links keep working.
 */
function CategoryRedirect() {
  const { slug } = useParams();
  const { catalog } = useCatalog();
  const category = catalog.getCatalogCategory(slug);
  if (!category) return <NotFoundPage />;
  return <Navigate to={`/products?category=${encodeURIComponent(category.name)}`} replace />;
}
