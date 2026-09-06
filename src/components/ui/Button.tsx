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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl select-none tactile-press cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none';
  
  const variants = {
    primary: 'bg-[#e50914] hover:bg-[#ff1e27] text-white shadow-md shadow-red-950/40 border border-red-500/40 font-semibold',
    secondary: 'bg-[#212121] hover:bg-[#2c2c2c] text-white border border-[#383838]',
    gold: 'bg-[#e50914] hover:bg-[#ff1e27] text-white font-semibold shadow-md shadow-red-950/40 border border-red-400/40',
    outline: 'bg-transparent border border-[#383838] hover:border-neutral-500 hover:bg-[#212121] text-neutral-200 hover:text-white',
    danger: 'bg-red-700 hover:bg-red-600 text-white shadow-sm border border-red-500/30',
    ghost: 'bg-transparent hover:bg-[#212121] text-neutral-300 hover:text-white border border-transparent',
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
