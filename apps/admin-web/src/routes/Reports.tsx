import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type ReportItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/EmptyState';

type FilterTab = 'all' | 'pending' | 'resolved';

export function Reports() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminApi.getReports(),
  });

  const filtered = useMemo(() => {
    if (filter === 'pending') return reports.filter((r) => !r.resolvedAt);
    if (filter === 'resolved') return reports.filter((r) => r.resolvedAt);
    return reports;
  }, [reports, filter]);

  const resolveMutation = useMutation({
    mutationFn: (reportId: string) =>
      adminApi.resolveReport(reportId, feedback.trim() ? { resolutionFeedback: feedback } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setResolveId(null);
      setFeedback('');
      toast.addToast('success', 'Denúncia marcada como resolvida.');
    },
    onError: () => toast.addToast('error', 'Não foi possível resolver a denúncia.'),
  });

  if (isLoading) return <div className="text-adopet-text-secondary">Carregando…</div>;
  if (error) return <div className="rounded-lg bg-adopet-accent/10 text-adopet-accent p-4">Erro ao carregar.</div>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Denúncias</h1>
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === tab ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
            }`}
          >
            {tab === 'all' ? 'Todas' : tab === 'pending' ? 'Pendentes' : 'Resolvidas'}
          </button>
        ))}
      </div>
      {reports.length === 0 ? (
        <EmptyState message="Nenhuma denúncia." />
      ) : (
        <div className="space-y-4">
          {resolveId && (
            <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4">
              <label className="block text-sm font-medium mb-2">Feedback para o denunciador (opcional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30"
                rows={2}
                placeholder="Mensagem opcional ao resolver"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => resolveMutation.mutate(resolveId)}
                  disabled={resolveMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Resolvendo…' : 'Marcar como resolvida'}
                </button>
                <button
                  type="button"
                  onClick={() => { setResolveId(null); setFeedback(''); }}
                  className="px-4 py-2 rounded-lg border border-adopet-primary/30"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header border-b border-adopet-primary/20">
                    <th className="text-left p-3">Alvo</th>
                    <th className="text-left p-3">Motivo</th>
                    <th className="text-left p-3">Descrição</th>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: ReportItem) => (
                    <tr key={r.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                      <td className="p-3">{r.targetType} #{r.targetId.slice(0, 8)}</td>
                      <td className="p-3">{r.reason}</td>
                      <td className="p-3 max-w-[200px] truncate">{r.description ?? '—'}</td>
                      <td className="p-3">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">
                        {r.resolvedAt ? (
                          <span className="text-adopet-primary">Resolvida</span>
                        ) : (
                          <span className="text-adopet-orange">Pendente</span>
                        )}
                      </td>
                      <td className="p-3">
                        {!r.resolvedAt && (
                          <button
                            type="button"
                            onClick={() => setResolveId(r.id)}
                            className="text-adopet-primary font-medium hover:underline"
                          >
                            Resolver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
