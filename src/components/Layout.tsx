import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BottomNavigation } from './BottomNavigation';
import { HelmetProvider } from 'react-helmet-async';
import { SEO } from './SEO';
import { MiniAppLayout } from './MiniAppLayout';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isMiniAppPage, setIsMiniAppPage] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Check if we're in PayPay Mini App environment
  useEffect(() => {
    const isPayPayMiniApp = typeof window !== 'undefined' && 
                            (window as any).pp && 
                            typeof (window as any).pp.getUAID === 'function';
    setIsMiniApp(isPayPayMiniApp);

    // Check if current page is a mini app specific page
    const miniAppPages = ['/mini-app-payment'];
    setIsMiniAppPage(miniAppPages.includes(location.pathname));
  }, [location.pathname]);

  // Use mini app layout for mini app specific pages
  if (isMiniApp && isMiniAppPage) {
    return (
      <HelmetProvider>
        <SEO />
        <MiniAppLayout>
          {children}
        </MiniAppLayout>
      </HelmetProvider>
    );
  }

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
