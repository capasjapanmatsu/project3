import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BottomNavigation } from './BottomNavigation';
import { HelmetProvider } from 'react-helmet-async';
import { SEO } from './SEO';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <HelmetProvider>
      <SEO />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main id="main-content" className="flex-grow container mx-auto px-4 py-8 pb-20 md:pb-8">
          {children}
        </main>
        <Footer />
        <BottomNavigation />
      </div>
    </HelmetProvider>
  );
};

export default Layout;
