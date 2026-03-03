import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  accent?: 'primary' | 'orange' | 'accent';
  /** Se informado, o card vira link para a tela de detalhamento */
  to?: string;
};

export function StatCard({ title, value, icon, accent = 'primary', to }: Props) {
  const bg = {
    primary: 'bg-adopet-primary/10 text-adopet-primary',
    orange: 'bg-adopet-orange/10 text-adopet-orange',
    accent: 'bg-adopet-accent/10 text-adopet-accent',
  }[accent];
  const className =
    'bg-adopet-card rounded-xl border border-adopet-primary/10 p-5 shadow-card hover:shadow-card-hover transition-shadow block';
  const content = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-adopet-text-secondary">{title}</p>
        <p className="mt-1 text-2xl font-bold text-adopet-text-primary tracking-tight">{value}</p>
      </div>
      {icon && <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>}
    </div>
  );
  if (to) {
    return (
      <Link to={to} className={`${className} hover:border-adopet-primary/20`} title={`Ver detalhes: ${title}`}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
