import { Outlet } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { WhatsAppButton } from '../components/WhatsAppButton';

export function StoreLayout() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main><Outlet /></main>
      <Footer />
      {/* One floating control for the whole shop, so it is identical on every page and
          cannot cover page content. The wrapper is pointer-events-none so only the
          button itself intercepts clicks. */}
      <WhatsAppButton />
    </div>
  );
}
