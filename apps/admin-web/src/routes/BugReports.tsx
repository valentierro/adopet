import { useQuery } from '@tanstack/react-query';
import { adminApi, type BugReportItem } from '@/api/admin';
import { EmptyState } from '@/components/EmptyState';

export function BugReports() {
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'bug-reports'],
    queryFn: () => adminApi.getBugReports(),
  });

  if (isLoading) return <div className="text-adopet-text-secondary">Carregando…</div>;
  if (error) return <div className="rounded-lg bg-adopet-accent/10 text-adopet-accent p-4">Erro ao carregar.</div>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Bug reports</h1>
      {list.length === 0 ? (
        <EmptyState message="Nenhum report de bug." />
      ) : (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adopet-header border-b border-adopet-primary/20">
                  <th className="text-left p-3">Usuário</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Mensagem</th>
                  <th className="text-left p-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item: BugReportItem) => (
                  <tr key={item.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                    <td className="p-3">{item.userName ?? '—'}</td>
                    <td className="p-3">{item.userEmail ?? '—'}</td>
                    <td className="p-3">{item.type ?? '—'}</td>
                    <td className="p-3 max-w-xs truncate" title={item.message}>{item.message}</td>
                    <td className="p-3">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
