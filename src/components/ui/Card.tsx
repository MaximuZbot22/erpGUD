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
      className={`bg-slate-900/80 backdrop-blur-md rounded-2xl ${
        luxuryBorder 
          ? 'border border-amber-500/20 shadow-xl shadow-amber-950/10' 
          : 'border border-slate-800/80 shadow-lg shadow-black/40'
      } ${
        hoverEffect ? 'hover:border-slate-700/90 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200' : ''
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
