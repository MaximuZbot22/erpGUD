import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { VersionProvider } from './context/VersionContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { UserManagement } from './pages/UserManagement';
import { TasksPage } from './pages/TasksPage';
import { CalendarPage } from './pages/CalendarPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { InvoiceGenerator } from './pages/InvoiceGenerator';
import { StockTracker } from './pages/StockTracker';
import { ModuleView } from './pages/ModuleView';
import { QuotationStudio } from './pages/QuotationStudio';
import { SalesOrderManager } from './pages/SalesOrderManager';
import { DeliveryManager } from './pages/DeliveryManager';
import { ProcurementManager } from './pages/ProcurementManager';
import { ReturnsManager } from './pages/ReturnsManager';
import { NotesManager } from './pages/NotesManager';
import { HamperStudio } from './pages/HamperStudio';
import { GudLogo } from './components/Sidebar';
import { Loader2 } from 'lucide-react';

const getFaviconSvg = (color: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 671 671" width="100%" height="100%">
  <g fill="${color}">
    <path d="M280.05,143.279c0,50.904 -42.396,92.313 -94.512,92.313c-52.1,-0 -94.496,-41.409 -94.496,-92.313c-0,-50.9 42.396,-92.308 94.496,-92.308c36.075,-0 69.495,20.504 85.158,52.258l47.012,-22.116c-24.287,-49.271 -76.179,-81.113 -132.171,-81.113c-80.883,0 -146.683,64.271 -146.683,143.279c0,79.013 65.8,143.284 146.683,143.284c35.971,-0 68.959,-12.709 94.513,-33.784l-0,253.904c-0,61.371 -51.108,111.305 -113.938,111.305c-62.812,-0 -113.925,-49.934 -113.925,-111.305c0,-61.283 51.042,-111.195 113.75,-111.283l54.409,0l-10.434,-50.975l-44.008,0c-91.479,0.125 -165.904,72.9 -165.904,162.258c-0,89.48 74.512,162.275 166.112,162.275c91.596,0 166.125,-72.795 166.125,-162.275l0,-363.404l-52.187,0Z"/>
    <path d="M613.946,143.283c0.817,5.434 1.546,11.371 1.562,13.105c0,54.67 -33.629,91.408 -83.695,91.408c-49.48,-0 -85.4,-36.683 -85.4,-87.225c-0,-2.95 0.816,-10.763 1.65,-17.292l-51.688,0c-0.625,5.646 -1.267,12.521 -1.267,17.292c0,78.979 58.767,138.546 136.705,138.546c78.245,-0.004 135.016,-60.038 135.016,-142.729c0,-3.575 -0.504,-8.542 -1.058,-13.109l-51.825,0l-0,0.004Z"/>
    <path d="M506.958,615.2l-55.57,0l-0,-219.738l55.57,0c59.292,0 107.555,51.075 108.563,109.88c-1.009,58.783 -49.271,109.858 -108.563,109.858m0,-270.763l-106.875,-0.016l0,321.821l106.875,-0.017c87.571,0 158.875,-73.975 159.863,-160.883c-0.988,-86.913 -72.292,-160.904 -159.863,-160.904"/>
  </g>
</svg>
`;

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Sync with browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Security Gate: Redirect anonymous visitors back to /login
  useEffect(() => {
    if (!loading && (!user || !profile)) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
        setCurrentPath('/login');
      }
    } else if (!loading && user && profile && window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/dashboard');
      setCurrentPath('/dashboard');
    }
  }, [user, profile, loading]);

  // 1. Color-Looping favicon effect
  useEffect(() => {
    const colors = ['#c5a880', '#3d4b3e', '#b84a4d', '#4a5c4e', '#8c6239'];
    let idx = 0;
    const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'shortcut icon';
    
    const initSvg = getFaviconSvg(colors[0]);
    link.href = 'data:image/svg+xml;utf8,' + encodeURIComponent(initSvg);
    if (!link.parentNode) {
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    const interval = setInterval(() => {
      idx = (idx + 1) % colors.length;
      const svgString = getFaviconSvg(colors[idx]);
      link.href = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Support global navigation overrides
  useEffect(() => {
    (window as any).gudNavigate = (path: string) => {
      navigate(path);
    };
  }, []);

  // Handle page rendering based on simulated path routing
  const renderPage = () => {
    if (!profile) return null;

    switch (currentPath) {
      case '/dashboard':
        return <Dashboard onNavigate={navigate} />;
      
      case '/settings':
        return <Settings />;
      
      case '/user-management':
        return <UserManagement />;
      
      case '/tasks':
        return <ModuleView moduleId="tasks" />;
      
      case '/calendar':
        return <CalendarPage />;

      case '/documents':
        return <DocumentsPage />;

      case '/invoice-generator':
        return <InvoiceGenerator />;

      case '/stock-checker':
        return <StockTracker />;

      case '/quotations':
        return <QuotationStudio onNavigate={navigate} />;

      case '/sales-orders':
        return <SalesOrderManager onNavigate={navigate} />;

      case '/delivery':
        return <DeliveryManager />;

      case '/procurement-manager':
        return <ProcurementManager />;

      case '/returns':
        return <ReturnsManager onNavigate={navigate} />;

      case '/notes':
        return <NotesManager />;

      case '/hampers':
        return <HamperStudio />;

      default:
        const moduleId = currentPath.substring(1);
        return <ModuleView moduleId={moduleId} />;
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0eee9] dark:bg-slate-950 flex flex-col items-center justify-center space-y-4 select-none">
        <div className="text-emerald-700 dark:text-emerald-450 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-white dark:border-slate-800 animate-pulse">
          <GudLogo size={48} />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Authenticating GUD Credentials...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user || !profile) {
    return <Login />;
  }

  // 3. Authenticated Layout
  return (
    <Layout
      currentPath={currentPath}
      onNavigate={navigate}
      onSearch={setSearchQuery}
    >
      {renderPage()}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <VersionProvider>
          <AppContent />
        </VersionProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
