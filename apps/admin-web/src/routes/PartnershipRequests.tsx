import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  type PartnershipRequestItem,
} from '@/api/admin';
import { useToast } from '@/context/ToastContext';

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export function PartnershipRequests() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<FilterStatus>('PENDING');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['admin', 'partnership-requests'],
    queryFn: () => adminApi.getPartnershipRequests(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approvePartnershipRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partnership-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.addToast('success', 'Solicitação aprovada.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao aprovar.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.rejectPartnershipRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partnership-requests'] });
      setRejectId(null);
      setRejectReason('');
      toast.addToast('success', 'Solicitação rejeitada.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao rejeitar.'),
  });

  const filtered =
    filter === 'ALL'
      ? list
      : list.filter((r: PartnershipRequestItem) => r.status === filter);

  const pendingCount = list.filter((r: PartnershipRequestItem) => r.status === 'PENDING').length;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">
        Solicitações de parceria
      </h1>
      <p className="text-adopet-text-secondary mb-4">
        Solicitações enviadas pelo formulário do app. Aprovar cria o parceiro e envia e-mail para definição de senha.
      </p>

      <div className="flex gap-2 mb-4">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === tab ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
            }`}
          >
            {tab === 'PENDING' ? `Pendentes (${pendingCount})` : tab === 'ALL' ? 'Todas' : tab}
          </button>
        ))}
      </div>

      {rejectId && (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4 mb-4">
          <label className="block text-sm font-medium mb-2">Motivo da rejeição (opcional)</label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: Documentação incompleta"
            className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30 mb-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                rejectMutation.mutate({ id: rejectId, reason: rejectReason.trim() || undefined })
              }
              disabled={rejectMutation.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
            >
              Rejeitar
            </button>
            <button
              type="button"
              onClick={() => { setRejectId(null); setRejectReason(''); }}
              className="px-4 py-2 rounded-lg border border-adopet-primary/30"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-adopet-text-secondary">Carregando…</div>
      ) : filtered.length === 0 ? (
        <p className="text-adopet-text-secondary">
          {filter === 'PENDING'
            ? 'Nenhuma solicitação pendente.'
            : `Nenhuma solicitação com status ${filter}.`}
        </p>
      ) : (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adopet-header border-b border-adopet-primary/20">
                  <th className="text-left p-3">Instituição</th>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">Telefone</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Status</th>
                  {filter !== 'ALL' && filter !== 'APPROVED' && filter !== 'REJECTED' && (
                    <th className="text-left p-3">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: PartnershipRequestItem) => (
                  <tr key={r.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                    <td className="p-3 font-medium">{r.instituicao}</td>
                    <td className="p-3">{r.nome}</td>
                    <td className="p-3">{r.email}</td>
                    <td className="p-3">{r.telefone}</td>
                    <td className="p-3">{r.tipo}</td>
                    <td className="p-3">{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="p-3">
                      <span
                        className={
                          r.status === 'PENDING'
                            ? 'text-adopet-orange'
                            : r.status === 'APPROVED'
                              ? 'text-green-600'
                              : 'text-red-600'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    {(filter === 'ALL' || filter === 'PENDING') && r.status === 'PENDING' && (
                      <td className="p-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                          className="text-green-600 font-medium hover:underline disabled:opacity-50"
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectId(r.id)}
                          disabled={rejectMutation.isPending}
                          className="text-red-600 font-medium hover:underline disabled:opacity-50"
                        >
                          Rejeitar
                        </button>
                      </td>
                    )}
                    {(filter === 'ALL' || filter === 'PENDING') && r.status !== 'PENDING' && (
                      <td className="p-3">—</td>
                    )}
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
