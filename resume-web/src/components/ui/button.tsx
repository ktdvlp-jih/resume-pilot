import type { ReactNode } from 'react';

const variants = {
  default: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  outline: 'ui-btn-outline',
  ghost: 'ui-btn-ghost',
  dashed: 'ui-btn-dashed',
} as const;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  children: ReactNode;
};

export function Button({ variant = 'default', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ui-card ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-lg mb-3">{children}</h3>;
}
