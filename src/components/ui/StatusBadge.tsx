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
          bg: 'bg-emerald-500/10 border border-emerald-500/20 shadow-sm shadow-emerald-950/20',
          text: 'text-emerald-300 font-semibold',
          dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
          displayLabel: label || 'Active'
        };
      
      case 'gold':
      case 'premium':
      case 'signature':
        return {
          bg: 'bg-amber-500/10 border border-amber-500/30 shadow-sm shadow-amber-950/20',
          text: 'text-amber-300 font-semibold',
          dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
          displayLabel: label || 'Premium'
        };

      case 'warning':
      case 'pending':
      case 'follow-up':
      case 'beta':
      case 'partial':
      case 'under review':
      case 'sample ordered':
        return {
          bg: 'bg-amber-500/10 border border-amber-500/20',
          text: 'text-amber-300 font-semibold',
          dot: 'bg-amber-400',
          displayLabel: label || 'Pending'
        };

      case 'error':
      case 'overdue':
      case 'failed':
      case 'rejected':
      case 'danger':
      case 'cancelled':
        return {
          bg: 'bg-rose-500/10 border border-rose-500/20',
          text: 'text-rose-300 font-semibold',
          dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
          displayLabel: label || 'Overdue'
        };

      case 'info':
      case 'quoted':
      case 'planning':
      case 'sample':
      case 'sync':
        return {
          bg: 'bg-cyan-500/10 border border-cyan-500/20',
          text: 'text-cyan-300 font-semibold',
          dot: 'bg-cyan-400',
          displayLabel: label || 'In Review'
        };

      default:
        return {
          bg: 'bg-slate-800/60 border border-slate-700/60',
          text: 'text-slate-300',
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
