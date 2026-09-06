import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onSearch: (query: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPath,
  onNavigate,
  onSearch,
  children
}) => {
  return (
    <div className="h-full flex overflow-hidden bg-[#0f0f0f]">
      {/* Sidebar - Collapsible */}
      <Sidebar currentPath={currentPath} onNavigate={onNavigate} />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* TopBar */}
        <TopBar onSearch={onSearch} onNavigate={onNavigate} />

        {/* Dynamic Page Scroll Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 relative focus:outline-none">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;
