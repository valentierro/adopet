import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type ReportItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/EmptyState';
import { PaginationBar } from '@/components/PaginationBar';
import { Badge, Button, Card, PageHeading } from '@/components/ui';

type FilterTab = 'all' | 'pending' | 'resolved';

export function Reports() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [banReportedUser, setBanReportedUser] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [filterReason, setFilterReason] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminApi.getReports(),
  });

  const filtered = useMemo(() => {
    let list = reports;
    if (filter === 'pending') list = list.filter((r) => !r.resolvedAt);
    else if (filter === 'resolved') list = list.filter((r) => r.resolvedAt);
    const reason = filterReason.trim().toLowerCase();
    const target = filterTarget.trim().toLowerCase();
    if (reason) list = list.filter((r) => (r.reason ?? '').toLowerCase().includes(reason));
    if (target) list = list.filter((r) => `${r.targetType} ${r.targetId}`.toLowerCase().includes(target));
    return list;
  }, [reports, filter, filterReason, filterTarget]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize),
    [filtered, pageSafe, pageSize]
  );

  const resolveMutation = useMutation({
    mutationFn: (reportId: string) =>
      adminApi.resolveReport(reportId, {
        ...(feedback.trim() ? { resolutionFeedback: feedback } : {}),
        banReportedUser: banReportedUser || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setResolveId(null);
      setFeedback('');
      setBanReportedUser(false);
      toast.addToast('success', 'Denúncia marcada como resolvida.');
    },
    onError: () => toast.addToast('error', 'Não foi possível resolver a denúncia.'),
  });

  if (isLoading) return <div className="text-adopet-text-secondary">Carregando…</div>;
  if (error) return <div className="rounded-xl bg-adopet-accent/10 text-adopet-accent p-4">Erro ao carregar.</div>;

  return (
    <div>
      <PageHeading
        title="Denúncias"
        description="Gerir denúncias de anúncios, usuários e mensagens."
      />
      <div className="flex flex-wrap gap-3 mb-4">
        {(['all', 'pending', 'resolved'] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={filter === tab ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setFilter(tab); setPage(1); }}
          >
            {tab === 'all' ? 'Todas' : tab === 'pending' ? 'Pendentes' : 'Resolvidas'}
          </Button>
        ))}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <input
            type="text"
            value={filterTarget}
            onChange={(e) => { setFilterTarget(e.target.value); setPage(1); }}
            placeholder="Filtrar por alvo..."
            className="px-3 py-1.5 rounded-lg border border-adopet-primary/20 text-sm w-40"
          />
          <input
            type="text"
            value={filterReason}
            onChange={(e) => { setFilterReason(e.target.value); setPage(1); }}
            placeholder="Filtrar por motivo..."
            className="px-3 py-1.5 rounded-lg border border-adopet-primary/20 text-sm w-40"
          />
        </div>
      </div>
      {reports.length === 0 ? (
        <EmptyState message="Nenhuma denúncia." />
      ) : (
        <div className="space-y-4">
          {resolveId && (
            <Card padding="sm">
              <label className="block text-sm font-medium text-adopet-text-primary mb-2">Feedback para o denunciador (opcional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-adopet-primary/20 bg-adopet-card text-adopet-text-primary placeholder-adopet-text-secondary focus:outline-none focus:ring-2 focus:ring-adopet-primary/30 focus:border-adopet-primary/40"
                rows={2}
                placeholder="Mensagem opcional ao resolver"
              />
              <label className="flex items-center gap-2 mt-3 text-sm text-adopet-text-primary">
                <input
                  type="checkbox"
                  checked={banReportedUser}
                  onChange={(e) => setBanReportedUser(e.target.checked)}
                  className="rounded border-adopet-primary/30 text-adopet-primary focus:ring-adopet-primary"
                />
                Banir usuário denunciado (desativa a conta do alvo)
              </label>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  loading={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate(resolveId)}
                >
                  {resolveMutation.isPending ? 'Resolvendo…' : 'Marcar como resolvida'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setResolveId(null); setFeedback(''); setBanReportedUser(false); }}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          )}
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header/80 border-b border-adopet-primary/20">
                    <th className="text-left p-3 font-medium text-adopet-text-primary">Alvo</th>
                    <th className="text-left p-3 font-medium text-adopet-text-primary">Motivo</th>
                    <th className="text-left p-3 font-medium text-adopet-text-primary">Descrição</th>
                    <th className="text-left p-3 font-medium text-adopet-text-primary">Data</th>
                    <th className="text-left p-3 font-medium text-adopet-text-primary">Status</th>
                    <th className="text-left p-3 font-medium text-adopet-text-primary">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r: ReportItem) => (
                    <tr key={r.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50 transition-colors">
                      <td className="p-3 font-mono text-xs text-adopet-text-secondary">{r.targetType} #{r.targetId.slice(0, 8)}</td>
                      <td className="p-3">{r.reason}</td>
                      <td className="p-3 max-w-[200px] truncate text-adopet-text-secondary">{r.description ?? '—'}</td>
                      <td className="p-3 text-adopet-text-secondary">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">
                        {r.resolvedAt ? (
                          <Badge variant="success">Resolvida</Badge>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {!r.resolvedAt && (
                          <Button variant="ghost" size="sm" onClick={() => setResolveId(r.id)}>
                            Resolver
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-adopet-primary/10">
              <PaginationBar
                page={pageSafe}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
