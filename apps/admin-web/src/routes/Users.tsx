import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUserListItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';

const PAGE_SIZES = [10, 20, 50, 100] as const;

export function Users() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [unbanUserId, setUnbanUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users-list', search, page, pageSize],
    queryFn: () => adminApi.getUsersList(search.trim() || undefined, page, pageSize),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      adminApi.banUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setBanUserId(null);
      setBanReason('');
      toast.addToast('success', 'Usuário banido.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao banir.'),
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setUnbanUserId(null);
      toast.addToast('success', 'Usuário reativado.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao reativar.'),
  });

  const items: AdminUserListItem[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = () => {
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['admin', 'users-list'] });
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Usuários</h1>
      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div className="max-w-md flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">Buscar por nome ou e-mail</label>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Opcional — vazio lista todos"
              className="flex-1 px-4 py-2 rounded-lg border border-adopet-primary/30"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium"
            >
              Buscar
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Itens por página</label>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-adopet-primary/30 bg-adopet-card"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {banUserId && (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4 mb-4">
          <h3 className="font-medium text-adopet-text-primary mb-2">Banir usuário</h3>
          <p className="text-sm text-adopet-text-secondary mb-2">
            A conta será desativada. O usuário não poderá mais acessar o app.
          </p>
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30 mb-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => banMutation.mutate({ userId: banUserId, reason: banReason.trim() || undefined })}
              disabled={banMutation.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
            >
              {banMutation.isPending ? 'Banindo…' : 'Confirmar banimento'}
            </button>
            <button
              type="button"
              onClick={() => { setBanUserId(null); setBanReason(''); }}
              className="px-4 py-2 rounded-lg border border-adopet-primary/30"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {unbanUserId && (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4 mb-4">
          <h3 className="font-medium text-adopet-text-primary mb-2">Desbanir usuário</h3>
          <p className="text-sm text-adopet-text-secondary mb-2">
            O usuário poderá fazer login novamente no app.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => unbanMutation.mutate(unbanUserId)}
              disabled={unbanMutation.isPending}
              className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium disabled:opacity-50"
            >
              {unbanMutation.isPending ? 'Reativando…' : 'Confirmar reativação'}
            </button>
            <button
              type="button"
              onClick={() => setUnbanUserId(null)}
              className="px-4 py-2 rounded-lg border border-adopet-primary/30"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-adopet-text-secondary">Carregando…</div>
      ) : (
        <>
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header border-b border-adopet-primary/20">
                    <th className="text-left p-3">Nome</th>
                    <th className="text-left p-3">E-mail</th>
                    <th className="text-left p-3">Username</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-adopet-text-secondary">
                        {search ? 'Nenhum usuário encontrado.' : 'Digite na busca ou deixe vazio para listar todos.'}
                      </td>
                    </tr>
                  ) : (
                    items.map((u) => (
                      <tr key={u.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                        <td className="p-3 font-medium">{u.name}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">{u.username ?? '—'}</td>
                        <td className="p-3">
                          {u.deactivatedAt || u.bannedAt ? (
                            <span className="text-red-600">
                              {u.bannedAt
                                ? `Banido em ${new Date(u.bannedAt).toLocaleDateString('pt-BR')}${u.bannedReason ? ` — ${u.bannedReason}` : ''}`
                                : `Desativado em ${u.deactivatedAt ? new Date(u.deactivatedAt).toLocaleDateString('pt-BR') : ''}`}
                            </span>
                          ) : (
                            <span className="text-adopet-primary">Ativo</span>
                          )}
                        </td>
                        <td className="p-3">
                          {!u.deactivatedAt && !u.bannedAt ? (
                            <button
                              type="button"
                              onClick={() => setBanUserId(u.id)}
                              className="text-red-600 font-medium hover:underline"
                            >
                              Banir
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUnbanUserId(u.id)}
                              className="px-2 py-1 rounded-lg bg-adopet-primary/15 text-adopet-primary font-medium hover:bg-adopet-primary/25"
                            >
                              Desbanir
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="text-sm text-adopet-text-secondary">
              {total} usuário(s) — página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-adopet-text-secondary">Itens por página:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 rounded border border-adopet-primary/30 bg-adopet-card text-sm"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-lg border border-adopet-primary/30 disabled:opacity-50 text-sm"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-lg border border-adopet-primary/30 disabled:opacity-50 text-sm"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
