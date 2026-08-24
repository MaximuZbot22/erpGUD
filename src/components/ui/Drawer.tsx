import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'half';
  position?: 'right' | 'left' | 'center';
}

const WIDTHS = {
  sm: 440,
  md: 520,
  lg: 640,
  half: 640
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'half',
  position = 'right'
}) => {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Prevent background scroll when modal/drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
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

  const panelWidth = WIDTHS[size] || 640;

  const drawerContent = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, overflow: 'hidden' }}>
      {/* 1. FIXED VIEWPORT BACKDROP OVERLAY (Always covers current screen view with dark blur) */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99998,
          backgroundColor: animateIn ? 'rgba(2, 6, 23, 0.82)' : 'rgba(2, 6, 23, 0)',
          backdropFilter: animateIn ? 'blur(8px)' : 'none',
          WebkitBackdropFilter: animateIn ? 'blur(8px)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer'
        }}
      />

      {/* 2. FIXED VIEWPORT PANEL (Pinned directly to browser viewport window) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          height: '100vh',
          width: '100%',
          maxWidth: `${panelWidth}px`,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0c111d',
          borderLeft: '1px solid #1e293b',
          boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.75)',
          transform: animateIn ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backgroundColor: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '9999px',
              backgroundColor: '#408d6d',
              boxShadow: '0 0 10px rgba(64, 141, 109, 0.6)'
            }} />
            <h2 style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '0.01em',
            }}>
              {title}
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={onClose} 
            className="rounded-full !p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Inner Scrollable Body (Independent scroll inside drawer) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {children}
        </div>

        {/* Panel Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #1e293b',
              backgroundColor: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
