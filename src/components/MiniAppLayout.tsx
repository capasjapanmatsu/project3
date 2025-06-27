import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';

interface MiniAppLayoutProps {
  children: ReactNode;
}

export function MiniAppLayout({ children }: MiniAppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header for mini app */}
      <header className="bg-white shadow-sm py-3 px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-400 rounded-full flex items-center justify-center">
            <PawPrint className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-800">
            ドッグパーク<span className="text-blue-600">JP</span>
          </span>
        </Link>
      </header>
      
      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Simple footer for mini app */}
      <footer className="bg-white py-4 px-4 border-t border-gray-200">
        <div className="text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} ドッグパークJP</p>
          <div className="mt-1 space-x-3">
            <Link to="/terms" className="text-blue-600 hover:text-blue-800">利用規約</Link>
            <Link to="/privacy" className="text-blue-600 hover:text-blue-800">プライバシーポリシー</Link>
            <Link to="/business-information" className="text-blue-600 hover:text-blue-800">特商法表記</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}