import React, { useState, useEffect } from 'react';
import { Search, Bell, Sparkles } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { useVersion } from '../context/VersionContext';

interface TopBarProps {
  onSearch: (query: string) => void;
  onNavigate: (path: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch, onNavigate }) => {
  const { profile, googleToken, signInWithGoogle } = useAuth();
  const { version, toggleVersion } = useVersion();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [searchVal, setSearchVal] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Enforce dark mode class permanently on root
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 flex items-center justify-between relative z-20 select-none print-hide print:hidden">
        {/* Global Google Workspace Pill Search Bar */}
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search orders, inventory, contacts, invoices... (⌘K)"
            value={searchVal}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-9 py-2 text-xs bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 rounded-full transition-all focus:outline-none focus:ring-1 focus:ring-amber-400/50 text-slate-100 placeholder-slate-400 shadow-inner"
          />
          <kbd className="hidden sm:inline-flex absolute inset-y-0 right-0 pr-3.5 items-center pointer-events-none text-[9px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </div>

        {/* Toolbar items */}
        <div className="flex items-center gap-3">
          {/* Version Switcher Badge */}
          <button
            onClick={toggleVersion}
            title="Click to switch between v2 Clean (6 Sheets) and v1 Legacy (15 Sheets)"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border tactile-press cursor-pointer ${
              version === 'v2'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${version === 'v2' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
            <span>{version === 'v2' ? 'ERP v2 Clean (6 Sheets)' : 'ERP v1 Legacy (15 Sheets)'}</span>
          </button>

          {/* Quick Google Sync Alert Badge if token missing */}
          {!googleToken && profile?.role !== 'Guest' && (
            <button
              onClick={signInWithGoogle}
              title="Click to authenticate Google Workspace APIs"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[11px] font-semibold cursor-pointer tactile-press"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Connect Drive/Sheets</span>
            </button>
          )}

          {/* Notification Button */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full relative tactile-press"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-slate-900 shadow-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Notification Drawer */}
      <Drawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        title={`Notifications (${unreadCount} unread)`}
        footer={
          unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )
        }
      >
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Bell className="w-9 h-9 mx-auto mb-2 text-slate-600" />
            <p className="text-xs font-semibold">All caught up!</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No new system alerts or tasks.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markAsRead(n.id);
                  if (n.link) {
                    onNavigate(n.link);
                    setIsNotifOpen(false);
                  }
                }}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all relative ${
                  n.read
                    ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                    : 'bg-emerald-950/20 border-emerald-900/60 text-slate-100 hover:bg-emerald-950/30'
                }`}
              >
                {!n.read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-[#408d6d] rounded-full" />
                )}

                <div className="pr-4 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white leading-tight">
                      {n.title}
                    </span>
                    <StatusBadge status={n.priority} className="text-[8px] px-1 py-0 border-0" />
                  </div>
                  <p className="text-slate-400 leading-relaxed font-medium">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    {formatTime(n.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
};
export default TopBar;
