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
      className={`bg-[#141414] rounded-2xl border ${
        luxuryBorder 
          ? 'border-red-500/40 shadow-lg shadow-red-950/20' 
          : 'border-[#262626] shadow-md shadow-black/50'
      } ${
        hoverEffect ? 'hover:bg-[#181818] hover:border-[#383838] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200' : ''
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
    <div className={`px-5 py-4 border-b border-[#242424] flex items-center justify-between ${className}`} {...props}>
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
    <h3 className={`text-sm font-semibold text-white tracking-wide font-heading flex items-center gap-2 ${className}`} {...props}>
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
    <div className={`px-5 py-3.5 border-t border-[#242424] bg-[#0d0d0d] rounded-b-2xl flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
};
