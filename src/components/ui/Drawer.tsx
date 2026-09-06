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
      {/* 1. FIXED VIEWPORT BACKDROP OVERLAY */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99998,
          backgroundColor: animateIn ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0)',
          backdropFilter: animateIn ? 'blur(8px)' : 'none',
          WebkitBackdropFilter: animateIn ? 'blur(8px)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer'
        }}
      />

      {/* 2. FIXED VIEWPORT PANEL */}
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
          backgroundColor: '#1f1f1f',
          borderLeft: '1px solid #2e2e2e',
          boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.85)',
          transform: animateIn ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #282828',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backgroundColor: '#181818',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '9999px',
              backgroundColor: '#4ade80',
              boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)'
            }} />
            <h2 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.01em',
            }}>
              {title}
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={onClose} 
            className="rounded-full !p-1.5 text-[#aaaaaa] hover:text-white hover:bg-[#272727]"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Inner Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            color: '#f1f1f1',
          }}
        >
          {children}
        </div>

        {/* Panel Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #282828',
              backgroundColor: '#181818',
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
