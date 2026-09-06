import React, { useState } from 'react';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MODULE_REGISTRY } from '../services/modules';
import { DynamicIcon } from './ui/DynamicIcon';
import { StatusBadge } from './ui/StatusBadge';
import { Modal } from './ui/Modal';

// GUD Chocolates Vector Logo Component
export const GudLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 28 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 671 671" 
    className={className} 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <path d="M280.05,143.279c0,50.904 -42.396,92.313 -94.512,92.313c-52.1,-0 -94.496,-41.409 -94.496,-92.313c-0,-50.9 42.396,-92.308 94.496,-92.308c36.075,-0 69.495,20.504 85.158,52.258l47.012,-22.116c-24.287,-49.271 -76.179,-81.113 -132.171,-81.113c-80.883,0 -146.683,64.271 -146.683,143.279c0,79.013 65.8,143.284 146.683,143.284c35.971,-0 68.959,-12.709 94.513,-33.784l-0,253.904c-0,61.371 -51.108,111.305 -113.938,111.305c-62.812,-0 -113.925,-49.934 -113.925,-111.305c0,-61.283 51.042,-111.195 113.75,-111.283l54.409,0l-10.434,-50.975l-44.008,0c-91.479,0.125 -165.904,72.9 -165.904,162.258c-0,89.48 74.512,162.275 166.112,162.275c91.596,0 166.125,-72.795 166.125,-162.275l0,-363.404l-52.187,0Z" />
      <path d="M613.946,143.283c0.817,5.434 1.546,11.371 1.562,13.105c0,54.67 -33.629,91.408 -83.695,91.408c-49.48,-0 -85.4,-36.683 -85.4,-87.225c-0,-2.95 0.816,-10.763 1.65,-17.292l-51.688,0c-0.625,5.646 -1.267,12.521 -1.267,17.292c0,78.979 58.767,138.546 136.705,138.546c78.245,-0.004 135.016,-60.038 135.016,-142.729c0,-3.575 -0.504,-8.542 -1.058,-13.109l-51.825,0l-0,0.004Z" />
      <path d="M506.958,615.2l-55.57,0l-0,-219.738l55.57,0c59.292,0 107.555,51.075 108.563,109.88c-1.009,58.783 -49.271,109.858 -108.563,109.858m0,-270.763l-106.875,-0.016l0,321.821l106.875,-0.017c87.571,0 158.875,-73.975 159.863,-160.883c-0.988,-86.913 -72.292,-160.904 -159.863,-160.904" />
    </g>
  </svg>
);

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const { user, profile, signOutUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!profile) return null;

  const allowedModules = MODULE_REGISTRY;
  const commandCenter = allowedModules.filter((m) => m.category === 'command-center');
  const salesCustomers = allowedModules.filter((m) => m.category === 'sales-customers');
  const supplyChain = allowedModules.filter((m) => m.category === 'supply-chain');
  const businessIntel = allowedModules.filter((m) => m.category === 'business-intel');
  const complianceAdmin = allowedModules.filter((m) => m.category === 'compliance-admin');
  const system = allowedModules.filter((m) => m.category === 'system');

  const renderModuleLink = (mod: typeof MODULE_REGISTRY[0]) => {
    const isActive = currentPath === mod.path;
    
    return (
      <a
        key={mod.id}
        href={mod.path}
        onClick={(e) => { e.preventDefault(); onNavigate(mod.path); }}
        title={collapsed ? mod.name : undefined}
        className={`w-full flex items-center rounded-xl text-xs font-medium group tactile-press cursor-pointer transition-colors ${
          collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
        } ${
          isActive
            ? 'bg-red-600/15 text-white border border-red-500/40 shadow-sm shadow-red-950/20 font-semibold'
            : 'text-neutral-400 hover:text-white hover:bg-[#1a1a1a]'
        }`}
      >
        <div className={`flex items-center truncate ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <DynamicIcon 
            name={mod.iconName} 
            className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
              isActive 
                ? 'text-red-500' 
                : 'text-neutral-500 group-hover:text-red-400'
            }`} 
          />
          {!collapsed && <span className="truncate">{mod.name}</span>}
        </div>

        {!collapsed && mod.status !== 'active' && (
          <span className="flex-shrink-0 ml-1.5">
            <StatusBadge 
              status={mod.status} 
              label={mod.status === 'google-sync-required' ? 'Sync' : undefined} 
              className="text-[9px] px-1.5 py-0 shadow-none border-0" 
            />
          </span>
        )}
      </a>
    );
  };

  return (
    <aside
      className={`h-full border-r border-[#242424] bg-[#0c0c0c] flex flex-col justify-between transition-all duration-300 relative z-30 select-none print-hide print:hidden ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header Block */}
        <div className={`h-16 flex items-center border-b border-[#242424] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="text-red-500 flex-shrink-0 bg-red-600/10 p-1.5 rounded-xl border border-red-500/20 shadow-sm shadow-red-950/20">
              <GudLogo size={22} />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-white text-sm font-heading whitespace-nowrap">
                  GUDORIA ERP
                </span>
                <span className="text-[10px] text-red-400/80 font-medium tracking-wide">
                  Atelier Confectionery
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-5 p-1 bg-[#181818] border border-[#383838] rounded-full text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors shadow-md"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Action Button */}
        <div className={`p-3 border-b border-[#242424] ${collapsed ? 'px-2' : ''}`}>
          <a
            href="/invoice-generator"
            onClick={(e) => { e.preventDefault(); onNavigate('/invoice-generator'); }}
            title={collapsed ? "New Invoice" : undefined}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl shadow-md shadow-red-950/40 border border-red-500/30 tactile-press font-semibold text-xs group cursor-pointer ${
              collapsed ? 'p-2.5' : 'px-3 py-2.5'
            }`}
          >
            <span className="text-base font-normal leading-none">+</span>
            {!collapsed && <span>New Invoice</span>}
          </a>
        </div>

        {/* Navigation Map */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Command Center */}
          {commandCenter.length > 0 && (
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-2 mb-1.5">
                  🏠 Command Center
                </p>
              )}
              {commandCenter.map(renderModuleLink)}
            </div>
          )}

          {/* Sales & Customers */}
          {salesCustomers.length > 0 && (
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-2 mb-1.5">
                  🤝 Sales & Customers
                </p>
              )}
              {salesCustomers.map(renderModuleLink)}
            </div>
          )}

          {/* Supply Chain */}
          {supplyChain.length > 0 && (
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-2 mb-1.5">
                  🏭 Supply Chain
                </p>
              )}
              {supplyChain.map(renderModuleLink)}
            </div>
          )}

          {/* Business Intelligence */}
          {businessIntel.length > 0 && (
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-2 mb-1.5">
                  📊 Business Intelligence
                </p>
              )}
              {businessIntel.map(renderModuleLink)}
            </div>
          )}

          {/* Compliance & Admin */}
          {complianceAdmin.length > 0 && (
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-2 mb-1.5">
                  📋 Compliance & Admin
                </p>
              )}
              {complianceAdmin.map(renderModuleLink)}
            </div>
          )}

          {/* System */}
          {system.length > 0 && (
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-2 mb-1.5">
                  ⚙️ System
                </p>
              )}
              {system.map(renderModuleLink)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Profile Summary */}
      <div className="p-3 border-t border-[#242424] bg-[#0f0f0f]">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 min-w-0 cursor-pointer group hover:opacity-90 transition-opacity"
            title="View Profile Details"
          >
            {/* Avatar Fallback */}
            <div className="w-8.5 h-8.5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : profile.email.charAt(0).toUpperCase()}
            </div>
            
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-semibold text-white truncate group-hover:text-red-400">
                  {profile.displayName || 'GUD Member'}
                </p>
                <span className="text-[9px] font-semibold text-red-400 bg-red-950/40 border border-red-900/40 px-1.5 py-0.5 rounded-full mt-0.5 inline-block capitalize">
                  {profile.role}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={signOutUser}
              title="Sign Out"
              className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-950/20 transition-all"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {isProfileOpen && (
        <Modal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          title="User Profile Details"
          footer={
            <div className="flex justify-between items-center w-full">
              <button
                onClick={signOutUser}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg text-xs font-bold transition-all"
              >
                Sign Out / Log Out
              </button>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-slate-700 dark:text-slate-200 text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-105 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : profile.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {profile.displayName || 'GUD Member'}
                </h4>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-450 font-bold uppercase tracking-wider mt-0.5">
                  {profile.role}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p>
                <strong>Email Address:</strong> <span className="font-mono text-slate-500 dark:text-slate-400">{profile.email}</span>
              </p>
              <p>
                <strong>Account ID:</strong> <span className="font-mono text-slate-400">{profile.uid}</span>
              </p>
              {user?.metadata.lastSignInTime && (
                <p>
                  <strong>Last Login Time:</strong> <span className="text-slate-500 dark:text-slate-400">{new Date(user.metadata.lastSignInTime).toLocaleString()}</span>
                </p>
              )}
            </div>

            <div className="space-y-1 pt-2">
              <strong className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Access Permissions</strong>
              <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
                {profile.permissions.map(perm => (
                  <span key={perm} className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  );
};
export default Sidebar;
