import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';

export interface DetailField {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  copyable?: boolean;
}

export interface DetailAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
}

export interface DetailSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  docId?: string;
  status?: string;
  statusLabel?: string;
  fields?: DetailField[];
  actions?: DetailAction[];
  children?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

const WIDTH_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl'
};

export const DetailSlideOver: React.FC<DetailSlideOverProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  docId,
  status,
  statusLabel,
  fields = [],
  actions = [],
  children,
  width = 'lg'
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => setVisible(false), 220);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!visible) return null;

  const handleCopyId = () => {
    if (!docId) return;
    navigator.clipboard.writeText(docId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const content = (
    <div className="fixed inset-0 z-[99999] overflow-hidden">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[99998] transition-all duration-200 cursor-pointer ${
          animateIn ? 'bg-black/75 backdrop-blur-sm opacity-100' : 'bg-transparent opacity-0'
        }`}
      />

      {/* Slide-over panel */}
      <aside
        className={`fixed top-0 bottom-0 right-0 h-screen w-full ${WIDTH_CLASSES[width]} z-[99999] flex flex-col bg-[#1a1a1a] border-l border-[#2e2e2e] shadow-2xl transition-transform duration-220 ease-out select-none ${
          animateIn ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Block */}
        <div className="px-6 py-4.5 border-b border-[#282828] bg-[#141414] flex items-center justify-between flex-shrink-0">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              {docId && (
                <button
                  onClick={handleCopyId}
                  title="Click to copy ID"
                  className="font-mono text-xs font-bold text-zinc-300 bg-[#242424] hover:bg-[#2e2e2e] px-2 py-0.5 rounded border border-[#383838] flex items-center gap-1 transition-colors group"
                >
                  <span>{docId}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                  )}
                </button>
              )}
              {status && (
                <StatusBadge 
                  status={status} 
                  label={statusLabel} 
                  className="text-[10px] px-2 py-0.5" 
                />
              )}
            </div>
            <h2 className="text-base font-bold text-white font-heading truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-zinc-400 truncate">
                {subtitle}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="xs"
            onClick={onClose}
            className="rounded-full !p-1.5 text-zinc-400 hover:text-white hover:bg-[#272727]"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Action Shortcuts Toolbar */}
        {actions.length > 0 && (
          <div className="px-6 py-2.5 bg-[#171717] border-b border-[#262626] flex items-center gap-2 overflow-x-auto">
            {actions.map((act, i) => (
              <Button
                key={i}
                variant={act.variant || 'secondary'}
                size="xs"
                onClick={act.onClick}
                leftIcon={act.icon}
                className="text-xs font-semibold whitespace-nowrap"
              >
                {act.label}
              </Button>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-zinc-200">
          {/* Metadata Grid */}
          {fields.length > 0 && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#121212] rounded-xl border border-[#282828]">
              {fields.map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                    {field.icon && <span className="text-zinc-400">{field.icon}</span>}
                    {field.label}
                  </p>
                  <div className="text-xs font-semibold text-white">
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Children details (e.g. Items table or custom blocks) */}
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#262626] bg-[#141414] flex items-center justify-between flex-shrink-0 text-xs text-zinc-400">
          <span className="text-[11px] font-mono">DocType Inspector</span>
          <Button variant="secondary" size="xs" onClick={onClose}>
            Done
          </Button>
        </div>
      </aside>
    </div>
  );

  return createPortal(content, document.body);
};
