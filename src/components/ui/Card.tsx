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
      className={`bg-[#1f1f1f] rounded-2xl border ${
        luxuryBorder 
          ? 'border-[#3e3e3e] shadow-md' 
          : 'border-[#2e2e2e] shadow-sm'
      } ${
        hoverEffect ? 'hover:bg-[#272727] hover:border-[#444444] transition-all duration-150' : ''
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
