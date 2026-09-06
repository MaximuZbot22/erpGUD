import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl select-none tactile-press cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none';
  
  const variants = {
    primary: 'bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] shadow-sm font-semibold border border-transparent',
    secondary: 'bg-[#272727] hover:bg-[#3f3f3f] text-[#f1f1f1] border border-[#383838]',
    gold: 'bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] font-semibold shadow-sm border border-transparent',
    outline: 'bg-transparent border border-[#3e3e3e] hover:border-[#606060] hover:bg-[#272727] text-[#f1f1f1]',
    danger: 'bg-[#272727] hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-rose-900/40',
    ghost: 'bg-transparent hover:bg-[#272727] text-[#aaaaaa] hover:text-white border border-transparent',
  };

  const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5',
    md: 'px-4 py-2 text-sm font-semibold gap-2',
    lg: 'px-5 py-2.5 text-base font-semibold gap-2.5',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
