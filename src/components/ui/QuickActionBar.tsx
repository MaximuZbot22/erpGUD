import React from 'react';
import { Plus, Package, Truck, Gift, FileText, ArrowRight } from 'lucide-react';

export interface ShortcutItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

interface QuickActionBarProps {
  onNavigate: (path: string) => void;
  className?: string;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({ onNavigate, className = '' }) => {
  const shortcuts: ShortcutItem[] = [
    {
      id: 'invoice',
      label: 'New Invoice',
      description: 'Generate commercial invoice & PDF',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      path: '/invoice-generator',
      badge: 'Quick'
    },
    {
      id: 'movement',
      label: 'Stock Movement',
      description: 'Log chocolate bar dispatch or intake',
      icon: <Package className="w-4 h-4 text-amber-400" />,
      path: '/stock-tracker',
    },
    {
      id: 'delivery',
      label: 'Delivery Note',
      description: 'Create hamper dispatch note',
      icon: <Truck className="w-4 h-4 text-sky-400" />,
      path: '/delivery-manager',
    },
    {
      id: 'hamper',
      label: 'Hamper Studio',
      description: 'Build custom luxury hamper sets',
      icon: <Gift className="w-4 h-4 text-purple-400" />,
      path: '/hamper-studio',
    }
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {shortcuts.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.path)}
          className="group flex flex-col justify-between p-3.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] hover:border-[#383838] rounded-xl transition-all duration-150 text-left cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="p-2 rounded-lg bg-[#121212] border border-[#262626] group-hover:scale-105 transition-transform">
              {item.icon}
            </div>
            {item.badge ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                {item.badge}
              </span>
            ) : (
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-white group-hover:text-white transition-colors">
              {item.label}
            </p>
            {item.description && (
              <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                {item.description}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
