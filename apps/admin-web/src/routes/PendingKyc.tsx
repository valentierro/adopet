import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type PendingKycItem, type ApprovedKycItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';

type Tab = 'pending' | 'approved';

export function PendingKyc() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'VERIFIED' | 'REJECTED' | null>(null);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [revokeUserId, setRevokeUserId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [approvedSearch, setApprovedSearch] = useState('');

  const { data: pendingList = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin', 'pending-kyc'],
    queryFn: () => adminApi.getPendingKyc(),
    enabled: tab === 'pending',
  });

  const { data: approvedList = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['admin', 'approved-kyc', approvedSearch],
    queryFn: () => adminApi.getApprovedKyc(approvedSearch.trim() || undefined),
    enabled: tab === 'approved',
  });

  const updateKycMutation = useMutation({
    mutationFn: ({
      userId,
      status,
      rejectionReason,
    }: {
      userId: string;
      status: 'VERIFIED' | 'REJECTED';
      rejectionReason?: string;
    }) => adminApi.updateUserKyc(userId, status, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.addToast('success', 'KYC atualizado.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro.'),
  });

  const bulkMutation = useMutation({
    mutationFn: ({
      userIds,
      status,
      rejectionReason,
    }: {
      userIds: string[];
      status: 'VERIFIED' | 'REJECTED';
      rejectionReason?: string;
    }) => adminApi.bulkUpdateKyc(userIds, status, rejectionReason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSelectedIds(new Set());
      setBulkStatus(null);
      setBulkRejectionReason('');
      toast.addToast(
        'success',
        `${data.processed} processado(s). ${data.errors.length ? `Erros: ${data.errors.join(', ')}` : ''}`
      );
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro em massa.'),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.revokeUserKyc(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approved-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setRevokeUserId(null);
      setRevokeReason('');
      toast.addToast('success', 'KYC revogado.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao revogar.'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pendingList.map((u) => u.userId)));
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">
        KYC — Verificação de identidade
      </h1>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            tab === 'pending' ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
          }`}
        >
          Pendentes ({pendingList.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('approved')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            tab === 'approved' ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
          }`}
        >
          Aprovados
        </button>
      </div>

      {tab === 'pending' && (
        <>
          {pendingList.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  if (ids.length === 0) return;
                  bulkMutation.mutate({ userIds: ids, status: 'VERIFIED' });
                }}
                disabled={selectedIds.size === 0 || bulkMutation.isPending}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
              >
                Aprovar selecionados ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={() => setBulkStatus('REJECTED')}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
              >
                Rejeitar selecionados ({selectedIds.size})
              </button>
            </div>
          )}

          {bulkStatus === 'REJECTED' && (
            <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4 mb-4">
              <p className="text-sm font-medium mb-2">Rejeitar em massa - motivo obrigatório</p>
              <input
                type="text"
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder="Motivo da rejeição"
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30 mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ids = Array.from(selectedIds);
                    if (ids.length === 0 || !bulkRejectionReason.trim()) return;
                    bulkMutation.mutate({
                      userIds: ids,
                      status: 'REJECTED',
                      rejectionReason: bulkRejectionReason.trim(),
                    });
                  }}
                  disabled={!bulkRejectionReason.trim() || bulkMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
                >
                  Rejeitar {selectedIds.size} usuário(s)
                </button>
                <button
                  type="button"
                  onClick={() => { setBulkStatus(null); setBulkRejectionReason(''); }}
                  className="px-4 py-2 rounded-lg border border-adopet-primary/30"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loadingPending ? (
            <div className="text-adopet-text-secondary">Carregando...</div>
          ) : pendingList.length === 0 ? (
            <p className="text-adopet-text-secondary">Nenhum KYC pendente.</p>
          ) : (
            <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-adopet-header border-b border-adopet-primary/20">
                      <th className="text-left p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pendingList.length && pendingList.length > 0}
                          onChange={toggleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </th>
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">E-mail</th>
                      <th className="text-left p-3">Enviado em</th>
                      <th className="text-left p-3">Documento / Selfie</th>
                      <th className="text-left p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingList.map((u: PendingKycItem) => (
                      <tr key={u.userId} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(u.userId)}
                            onChange={() => toggleSelect(u.userId)}
                          />
                        </td>
                        <td className="p-3 font-medium">{u.name}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">{new Date(u.kycSubmittedAt).toLocaleString('pt-BR')}</td>
                        <td className="p-3">
                          {u.documentUrl || u.selfieUrl ? (
                            <span className="flex gap-1">
                              {u.documentUrl && (
                                <a
                                  href={u.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-adopet-primary hover:underline"
                                >
                                  Doc
                                </a>
                              )}
                              {u.selfieUrl && (
                                <a
                                  href={u.selfieUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-adopet-primary hover:underline"
                                >
                                  Selfie
                                </a>
                              )}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateKycMutation.mutate({ userId: u.userId, status: 'VERIFIED' })}
                            disabled={updateKycMutation.isPending}
                            className="text-green-600 font-medium hover:underline disabled:opacity-50"
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateKycMutation.mutate({
                                userId: u.userId,
                                status: 'REJECTED',
                                rejectionReason: 'Documento não legível ou inconsistente.',
                              })
                            }
                            disabled={updateKycMutation.isPending}
                            className="text-red-600 font-medium hover:underline disabled:opacity-50"
                          >
                            Rejeitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'approved' && (
        <>
          <div className="mb-4 max-w-md">
            <label className="block text-sm font-medium mb-1">Buscar por nome, e-mail ou username</label>
            <input
              type="search"
              value={approvedSearch}
              onChange={(e) => setApprovedSearch(e.target.value)}
              placeholder="Opcional"
              className="w-full px-4 py-2 rounded-lg border border-adopet-primary/30"
            />
          </div>

          {revokeUserId && (
            <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4 mb-4">
              <p className="text-sm font-medium mb-2">Revogar KYC - motivo obrigatório</p>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Motivo da revogação"
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30 mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!revokeReason.trim()) return;
                    revokeMutation.mutate({ userId: revokeUserId, reason: revokeReason.trim() });
                  }}
                  disabled={!revokeReason.trim() || revokeMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
                >
                  Revogar
                </button>
                <button
                  type="button"
                  onClick={() => { setRevokeUserId(null); setRevokeReason(''); }}
                  className="px-4 py-2 rounded-lg border border-adopet-primary/30"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loadingApproved ? (
            <div className="text-adopet-text-secondary">Carregando...</div>
          ) : approvedList.length === 0 ? (
            <p className="text-adopet-text-secondary">
              {approvedSearch ? 'Nenhum resultado.' : 'Nenhum KYC aprovado.'}
            </p>
          ) : (
            <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-adopet-header border-b border-adopet-primary/20">
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">E-mail</th>
                      <th className="text-left p-3">Username</th>
                      <th className="text-left p-3">Aprovado em</th>
                      <th className="text-left p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedList.map((u: ApprovedKycItem) => (
                      <tr key={u.userId} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                        <td className="p-3 font-medium">{u.name}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">{u.username ?? '-'}</td>
                        <td className="p-3">{new Date(u.kycVerifiedAt).toLocaleString('pt-BR')}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setRevokeUserId(u.userId)}
                            className="text-red-600 font-medium hover:underline"
                          >
                            Revogar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
