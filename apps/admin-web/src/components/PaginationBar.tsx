export const PAGE_SIZES = [10, 20, 50, 100] as const;

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export function PaginationBar({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <p className="text-sm text-adopet-text-secondary">
        {total === 0 ? '0 itens' : `${start}-${end} de ${total}`}
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <>
            <label className="text-sm text-adopet-text-secondary">Itens por página:</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 rounded border border-adopet-primary/20 bg-adopet-card text-sm"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </>
        )}
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
    </div>
  );
}
