import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  luxuryBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = false,
  luxuryBorder = false,
  ...props 
}) => {
  return (
    <div
      className={`bg-[#0f172a] rounded-2xl border ${
        luxuryBorder 
          ? 'border-emerald-500/30 shadow-lg shadow-black/50' 
          : 'border-slate-800 shadow-md shadow-black/30'
      } ${
        hoverEffect ? 'hover:border-slate-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-150' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`px-5 py-4 border-b border-slate-800/70 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <h3 className={`text-sm font-semibold text-slate-100 tracking-wide font-heading flex items-center gap-2 ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`px-5 py-3.5 border-t border-slate-800/70 bg-slate-950/40 rounded-b-2xl flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
};
