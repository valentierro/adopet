type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationBar({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <p className="text-sm text-adopet-text-secondary">
        {start}-{end} de {total}
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-adopet-primary/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-adopet-primary/10"
        >
          Anterior
        </button>
        <span className="px-3 py-1.5 text-sm text-adopet-text-secondary">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-adopet-primary/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-adopet-primary/10"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
