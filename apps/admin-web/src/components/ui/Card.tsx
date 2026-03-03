import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** Optional padding; default is p-6 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className = '', padding = 'md' }: Props) {
  const base =
    'rounded-xl border border-adopet-primary/10 bg-adopet-card shadow-sm';
  return (
    <div className={`${base} ${paddingClasses[padding]} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <div>
        <h2 className="text-lg font-semibold text-adopet-text-primary">{title}</h2>
        {description && (
          <p className="text-sm text-adopet-text-secondary mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
