import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type VerificationItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';

function VerificationRow({
  item,
  onApprove,
  onReject,
  onRevoke,
  isRevokable,
  pending,
}: {
  item: VerificationItem;
  onApprove: () => void;
  onReject: () => void;
  onRevoke?: () => void;
  isRevokable?: boolean;
  pending: boolean;
}) {
  return (
    <tr className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
      <td className="p-3">{item.type}</td>
      <td className="p-3">{item.petName ?? item.userName ?? '—'}</td>
      <td className="p-3">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
      <td className="p-3">
        <div className="flex gap-2 flex-wrap">
          {item.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={pending}
                className="text-adopet-primary font-medium hover:underline disabled:opacity-50"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={pending}
                className="text-adopet-accent font-medium hover:underline disabled:opacity-50"
              >
                Rejeitar
              </button>
            </>
          )}
          {isRevokable && onRevoke && (
            <button
              type="button"
              onClick={onRevoke}
              disabled={pending}
              className="text-adopet-orange font-medium hover:underline disabled:opacity-50"
            >
              Revogar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function Verifications() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin', 'verifications', 'pending'],
    queryFn: () => adminApi.getPendingVerifications(),
  });
  const { data: approved = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['admin', 'verifications', 'approved'],
    queryFn: () => adminApi.getApprovedVerifications(),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      adminApi.resolveVerification(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.addToast('success', status === 'APPROVED' ? 'Verificação aprovada.' : 'Verificação rejeitada.');
    },
    onError: () => toast.addToast('error', 'Não foi possível atualizar a verificação.'),
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminApi.revokeVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.addToast('success', 'Verificação revogada.');
    },
    onError: () => toast.addToast('error', 'Não foi possível revogar.'),
  });

  const loading = tab === 'pending' ? loadingPending : loadingApproved;
  const list = tab === 'pending' ? pending : approved;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Verificações</h1>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${
            tab === 'pending' ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
          }`}
        >
          Pendentes ({pending.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('approved')}
          className={`px-4 py-2 rounded-lg font-medium ${
            tab === 'approved' ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
          }`}
        >
          Aprovadas ({approved.length})
        </button>
      </div>
      {loading ? (
        <div className="text-adopet-text-secondary">Carregando…</div>
      ) : (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adopet-header border-b border-adopet-primary/20">
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Pet / Usuário</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-adopet-text-secondary">
                      Nenhum item.
                    </td>
                  </tr>
                ) : (
                  list.map((item) => (
                    <VerificationRow
                      key={item.id}
                      item={item}
                      isRevokable={tab === 'approved'}
                      pending={resolveMutation.isPending || revokeMutation.isPending}
                      onApprove={() => resolveMutation.mutate({ id: item.id, status: 'APPROVED' })}
                      onReject={() => resolveMutation.mutate({ id: item.id, status: 'REJECTED' })}
                      onRevoke={() => revokeMutation.mutate(item.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
