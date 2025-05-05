import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-orange-100 ${className}`}>
      {children}
    </div>
  );
};

export default Card; 