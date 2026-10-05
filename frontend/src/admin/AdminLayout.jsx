import {
  Bell,
  Boxes,
  ClipboardList,
  ExternalLink,
  FileUp,
  Gift,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquareQuote,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Settings,
  ShoppingBag,
  Sparkles,
  Tags,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { OrderNotificationsProvider, useOrderNotifications } from '../hooks/useOrderNotifications';
import { roleLabels } from '../services/auth';
import { readStorage, writeStorage } from '../utils/storage';
import { AdminNotificationBell } from './AdminNotificationBell';

/** The screens the shop runs on, in the order an operator works through them. */
const primaryLinks = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true, permission: 'dashboard.view' },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag, permission: 'orders.view' },
  { label: 'Products', to: '/admin/products', icon: Package, permission: 'products.view' },
  { label: 'Categories', to: '/admin/categories', icon: Tags, permission: 'categories.view' },
  { label: 'Combo & gift packs', to: '/admin/combo-packs', icon: Gift, permission: 'packs.view' },
  { label: 'Customers', to: '/admin/customers', icon: Users, permission: 'customers.view' },
  { label: 'Payments', to: '/admin/payments', icon: Wallet, permission: 'orders.view' },
  { label: 'Reports', to: '/admin/reports', icon: TrendingUp, permission: 'reports.view' },
  { label: 'Notifications', to: '/admin/notifications', icon: Bell, permission: 'dashboard.view', count: true },
  { label: 'Contact details', to: '/admin/contact', icon: Phone, permission: 'contact.edit' },
  { label: 'Settings', to: '/admin/settings', icon: Settings, permission: 'settings.view' },
];

/** Everything that already existed stays reachable, just out of the main flow. */
const toolLinks = [
  { label: 'Enquiries', to: '/admin/enquiries', icon: ClipboardList },
  { label: 'Testimonials', to: '/admin/testimonials', icon: MessageSquareQuote },
  { label: 'Website content', to: '/admin/content', icon: Sparkles },
  { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
  { label: 'Excel import', to: '/admin/import', icon: FileUp },
];

const pageNames = {
  '/admin': 'Dashboard',
  '/admin/orders': 'Orders',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/combo-packs': 'Combo & gift packs',
  '/admin/customers': 'Customers',
  '/admin/payments': 'Payments',
  '/admin/reports': 'Reports',
  '/admin/notifications': 'Notifications',
  '/admin/contact': 'Contact details',
  '/admin/settings': 'Settings',
  '/admin/enquiries': 'Enquiries',
  '/admin/testimonials': 'Testimonials',
  '/admin/content': 'Website content',
  '/admin/inventory': 'Inventory',
  '/admin/import': 'Excel import',
};

const sidebarPreferenceKey = 'spark-shine-admin-sidebar-collapsed';

const renderNavLink = ({ label, to, icon: Icon, end, permission, can, collapsed, badge }) => {
  if (permission && !can(permission)) return null;
  return (
    <NavLink
      key={to}
      end={end}
      to={to}
      title={label}
      className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
    >
      <Icon size={17} strokeWidth={1.8} className="shrink-0" />
      <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
      {badge ? <span className={`ml-auto rounded-full bg-rose-600 px-1.5 py-0.5 text-[0.55rem] font-extrabold leading-none text-white ${collapsed ? 'lg:hidden' : ''}`}>{badge}</span> : null}
    </NavLink>
  );
};

export function AdminLayout() {
  return (
    <OrderNotificationsProvider>
      <AdminShell />
    </OrderNotificationsProvider>
  );
}

function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Rail mode is a desktop preference: it is remembered, and the drawer below lg is
  // always full width so the labels never disappear on a small screen.
  const [collapsed, setCollapsed] = useState(() => readStorage(sidebarPreferenceKey, false) === true);
  const { user, can, signOut, alert } = useAdminAuth();
  const { unreadCount } = useOrderNotifications();

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  useEffect(() => {
    writeStorage(sidebarPreferenceKey, collapsed);
  }, [collapsed]);

  const handleSignOut = () => {
    signOut();
    navigate('/admin/login', { replace: true });
  };

  const initials = (user?.name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-mist/40 text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white transition-[width,transform] duration-200 lg:translate-x-0 ${
          collapsed ? 'lg:w-20' : 'lg:w-72'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[5.25rem] shrink-0 items-center justify-between border-b border-stone-100 px-6 lg:px-4">
          {/* The collapsed rail is 80px wide with a 36px toggle beside it, which leaves no
              room for the artwork without shrinking it to a few pixels, so the rail keeps
              its blank header exactly as before and the lockup returns when it expands. */}
          {collapsed ? null : <BrandLogo size="admin" />}
          <button type="button" onClick={() => setSidebarOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 lg:hidden" aria-label="Close admin menu">
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand the admin menu' : 'Collapse the admin menu'}
            aria-pressed={collapsed}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-ink lg:flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5 lg:px-3" aria-label="Admin navigation">
          {collapsed ? null : <p className="px-3 pb-2 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-stone-300">Manage</p>}
          <div className="space-y-0.5">
            {primaryLinks.map((link) => renderNavLink({ ...link, can, collapsed, badge: link.count && unreadCount ? unreadCount : 0 }))}
          </div>

          {collapsed ? null : <p className="px-3 pb-2 pt-6 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-stone-300">Tools</p>}
          <div className="space-y-0.5">
            {toolLinks.map((link) => renderNavLink({ ...link, can, collapsed }))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-stone-100 p-4 lg:p-3">
          {user &&
            (collapsed ? null : (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-secondarySoft p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember text-xs font-bold text-white">{initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink">{user.name}</p>
                  <p className="truncate text-[0.62rem] text-stone-500">{roleLabels[user.role] || user.role}</p>
                </div>
              </div>
            ))}
          <button
            type="button"
            onClick={handleSignOut}
            title="Logout"
            className={`admin-sidebar-link w-full text-rose-600 hover:!bg-rose-50 hover:!text-rose-700 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
          <Link
            className={`admin-sidebar-link mt-0.5 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
            to="/"
            title="View storefront"
          >
            <ExternalLink size={17} className="shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>View storefront</span>
          </Link>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu overlay" />}

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 flex h-[5.25rem] items-center justify-between gap-3 border-b border-stone-200 bg-mist/40 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm lg:hidden"
              aria-label="Open admin menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[0.6rem] font-bold uppercase tracking-[0.16em] text-stone-400 sm:block">Anish Enterprises / Admin</p>
              <p className="truncate text-sm font-bold text-ink sm:mt-1">{pageNames[location.pathname] || 'Admin workspace'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AdminNotificationBell />
            <Link to="/admin/contact" className="hidden h-9 w-9 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition hover:text-goldInk sm:flex" aria-label="Contact details">
              <Mail size={16} />
            </Link>
            <Link to="/admin/settings" className="hidden h-9 w-9 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition hover:text-goldInk sm:flex" aria-label="Settings">
              <UserCircle size={16} />
            </Link>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-xs font-bold text-white" title={user ? `${user.name} (${roleLabels[user.role]})` : 'Signed out'}>
              {initials}
            </span>
          </div>
        </header>

        {alert && (
          <div className={`mx-4 mt-4 rounded-xl px-4 py-3 text-xs sm:mx-7 ${alert.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`} role="status">
            {alert.message}
          </div>
        )}

        <main className="px-4 py-8 sm:px-7 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
