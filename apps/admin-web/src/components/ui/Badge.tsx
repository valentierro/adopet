import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'info';

type Props = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  success:
    'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  warning:
    'bg-adopet-orange/15 text-adopet-orange border-adopet-orange/30',
  error:
    'bg-red-500/15 text-red-700 border-red-500/30',
  neutral:
    'bg-adopet-primary/10 text-adopet-text-secondary border-adopet-primary/20',
  primary:
    'bg-adopet-primary/15 text-adopet-primary border-adopet-primary/30',
  info:
    'bg-sky-500/15 text-sky-700 border-sky-500/30',
};

export function Badge({ variant = 'neutral', children, className = '' }: Props) {
  const base = 'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium';
  return (
    <span className={`${base} ${variantClasses[variant]} ${className}`.trim()}>
      {children}
    </span>
  );
}
