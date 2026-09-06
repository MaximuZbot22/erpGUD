import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      {/* Fixed Viewport Dark Blur Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 99998,
        }}
      />

      {/* Centered Modal Content Card with Spring Animation */}
      <div 
        className={`relative w-full ${sizes[size]} bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl shadow-black/90 z-[99999] text-left overflow-hidden flex flex-col max-h-[90vh] animate-spring-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282828] pb-4 mb-4 flex-shrink-0">
          <h3 className="text-base font-bold text-white tracking-wide font-heading">
            {title}
          </h3>
          <Button variant="ghost" size="xs" onClick={onClose} className="rounded-full !p-1.5 text-[#aaaaaa] hover:text-white hover:bg-[#272727]">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Body */}
        <div className="text-xs text-neutral-200 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#282828] pt-4 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
