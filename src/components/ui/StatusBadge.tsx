import React from 'react';

export type BadgeStatusType = 
  | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  | 'active' | 'beta' | 'disabled' | 'sync';

interface StatusBadgeProps {
  status: BadgeStatusType | string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  label, 
  className = '' 
}) => {
  const normStatus = (status || '').toLowerCase();
  
  const getStyles = (): { bg: string; text: string; dot: string; displayLabel: string } => {
    switch (normStatus) {
      case 'success':
      case 'paid':
      case 'active':
      case 'completed':
      case 'approved':
      case 'delivered':
        return {
          bg: 'bg-emerald-950/40 border border-emerald-800/60',
          text: 'text-emerald-300 font-semibold',
          dot: 'bg-[#408d6d]',
          displayLabel: label || 'Active'
        };
      
      case 'warning':
      case 'pending':
      case 'follow-up':
      case 'beta':
      case 'partial':
        return {
          bg: 'bg-amber-950/40 border border-amber-800/60',
          text: 'text-amber-300 font-semibold',
          dot: 'bg-amber-500',
          displayLabel: label || 'Pending'
        };

      case 'error':
      case 'overdue':
      case 'failed':
      case 'rejected':
      case 'danger':
      case 'cancelled':
        return {
          bg: 'bg-rose-950/40 border border-rose-800/60',
          text: 'text-rose-300 font-semibold',
          dot: 'bg-rose-500',
          displayLabel: label || 'Overdue'
        };

      case 'info':
      case 'processing':
      case 'in-progress':
      case 'shipped':
      case 'packed':
        return {
          bg: 'bg-cyan-950/40 border border-cyan-800/60',
          text: 'text-cyan-300 font-semibold',
          dot: 'bg-cyan-400',
          displayLabel: label || 'Processing'
        };

      case 'google-sync-required':
      case 'sync':
        return {
          bg: 'bg-purple-950/40 border border-purple-800/60',
          text: 'text-purple-300 font-semibold',
          dot: 'bg-purple-400',
          displayLabel: label || 'Sync'
        };

      case 'disabled':
      case 'neutral':
      case 'draft':
      default:
        return {
          bg: 'bg-slate-800/50 border border-slate-700/60',
          text: 'text-slate-300 font-medium',
          dot: 'bg-slate-400',
          displayLabel: label || status
        };
    }
  };

  const styles = getStyles();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] tracking-wide ${styles.bg} ${styles.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
      <span>{styles.displayLabel}</span>
    </span>
  );
};
