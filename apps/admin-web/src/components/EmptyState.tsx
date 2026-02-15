type Props = {
  message: string;
  icon?: boolean;
};

export function EmptyState({ message, icon = true }: Props) {
  return (
    <div className="rounded-xl border border-adopet-primary/10 bg-adopet-card p-8 text-center">
      {icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-adopet-primary/10 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-adopet-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v14" />
          </svg>
        </div>
      )}
      <p className="text-adopet-text-secondary">{message}</p>
    </div>
  );
}
