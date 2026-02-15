import type { ReactNode } from 'react';

type Props = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  accent?: 'primary' | 'orange' | 'accent';
};

export function StatCard({ title, value, icon, accent = 'primary' }: Props) {
  const bg = {
    primary: 'bg-adopet-primary/10 text-adopet-primary',
    orange: 'bg-adopet-orange/10 text-adopet-orange',
    accent: 'bg-adopet-accent/10 text-adopet-accent',
  }[accent];
  return (
    <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-adopet-text-secondary">{title}</p>
          <p className="mt-1 text-2xl font-bold text-adopet-text-primary">{value}</p>
        </div>
        {icon && <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>}
      </div>
    </div>
  );
}
