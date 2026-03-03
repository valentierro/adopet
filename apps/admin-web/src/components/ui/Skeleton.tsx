import type { ReactNode } from 'react';

type Props = {
  className?: string;
  children?: ReactNode;
};

/** Generic skeleton block for loading states. */
export function Skeleton({ className = '', children }: Props) {
  return (
    <div className={`animate-pulse rounded-xl bg-adopet-surface/80 ${className}`.trim()}>
      {children}
    </div>
  );
}

