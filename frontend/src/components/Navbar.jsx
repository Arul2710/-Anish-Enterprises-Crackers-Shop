import { Menu, Search, ShoppingCart, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { BrandLogo } from './BrandLogo';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Products', to: '/products' },
  { label: 'Combo & Gift', to: '/combo-packs' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

// The wholesale landing page is reached from the About page and the mobile menu rather
// than the primary bar, so the main navigation keeps its original five desktop items.
const wholesaleLink = { label: 'Wholesale Crackers in Sivakasi', to: '/sivakasi-wholesale-crackers' };

export function Navbar() {
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    if (location.pathname === '/products') {
      setSearch(new URLSearchParams(location.search).get('search') || '');
    }
  }, [location.pathname, location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-xl">
      <div className="container-shell flex h-[4.65rem] items-center justify-between gap-4">
        <BrandLogo size="nav" />

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Search catalog"
            aria-expanded={searchOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-navySoft transition hover:bg-panel hover:text-navy"
          >
            <Search size={18} strokeWidth={1.9} />
          </button>

          <Link
            to="/cart"
            aria-label={`Cart with ${itemCount} items`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-navySoft transition hover:bg-panel hover:text-navy"
          >
            <ShoppingCart size={18} strokeWidth={1.9} />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-royal px-1 text-[0.55rem] font-extrabold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-navySoft transition hover:bg-panel hover:text-navy lg:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line bg-white">
          <form className="container-shell flex items-center gap-3 py-3.5" onSubmit={submitSearch}>
            <Search size={17} className="shrink-0 text-royal" />
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-navyMute"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the 2026 catalog by name, code or category..."
              aria-label="Search products"
            />
            <button className="catalog-btn catalog-btn-primary shrink-0" type="submit">
              Search
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <div className="border-t border-line bg-white lg:hidden">
          <nav className="container-shell flex flex-col py-2" aria-label="Mobile navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `rounded-xl px-3 py-3 text-sm font-bold transition ${isActive ? 'bg-navy text-white' : 'text-navySoft hover:bg-panel'}`}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/cart" className="rounded-xl px-3 py-3 text-sm font-bold text-navySoft transition hover:bg-panel">
              Cart {itemCount > 0 && <span className="text-royal">({itemCount})</span>}
            </Link>
            <Link to="/faq" className="rounded-xl px-3 py-3 text-sm font-bold text-navySoft transition hover:bg-panel">
              FAQ
            </Link>
            <Link
              to={wholesaleLink.to}
              className="rounded-xl px-3 py-3 text-sm font-bold text-navySoft transition hover:bg-panel"
            >
              {wholesaleLink.label}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
