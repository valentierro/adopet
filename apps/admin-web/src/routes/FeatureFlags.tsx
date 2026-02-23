import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type FeatureFlagDto, type FeatureFlagScope } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { FeatureFlagFormModal } from '@/routes/FeatureFlagFormModal';

const SCOPES: { value: FeatureFlagScope | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'GLOBAL', label: 'Global' },
  { value: 'CITY', label: 'Cidade' },
  { value: 'PARTNER', label: 'Parceiro' },
];

const ENABLED_FILTER: { value: 'ALL' | 'ON' | 'OFF'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ON', label: 'Ligada' },
  { value: 'OFF', label: 'Desligada' },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ScopeBadge({ scope }: { scope: string }) {
  const classes =
    scope === 'GLOBAL'
      ? 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
      : scope === 'CITY'
        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
        : 'bg-green-500/20 text-green-700 dark:text-green-300';
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}>
      {scope}
    </span>
  );
}

export function FeatureFlags() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<FeatureFlagScope | 'ALL'>('ALL');
  const [enabledFilter, setEnabledFilter] = useState<'ALL' | 'ON' | 'OFF'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlagDto | null>(null);

  const { data: flags = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => adminApi.listFeatureFlags(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      adminApi.updateFeatureFlag(id, { enabled }),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'feature-flags'] });
      const prev = queryClient.getQueryData<FeatureFlagDto[]>(['admin', 'feature-flags']);
      queryClient.setQueryData<FeatureFlagDto[]>(['admin', 'feature-flags'], (old) =>
        (old ?? []).map((f) => (f.id === id ? { ...f, enabled } : f))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin', 'feature-flags'], ctx.prev);
      toast.addToast('error', err instanceof Error ? err.message : 'Erro ao atualizar.');
    },
    onSuccess: (_, { enabled }) => {
      toast.addToast('success', enabled ? 'Flag habilitada.' : 'Flag desabilitada.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] }),
  });

  const filtered = useMemo(() => {
    let list = flags;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (f) =>
          f.key.toLowerCase().includes(q) ||
          (f.description ?? '').toLowerCase().includes(q)
      );
    }
    if (scopeFilter !== 'ALL') list = list.filter((f) => f.scope === scopeFilter);
    if (enabledFilter === 'ON') list = list.filter((f) => f.enabled);
    if (enabledFilter === 'OFF') list = list.filter((f) => !f.enabled);
    return list.sort((a, b) => a.key.localeCompare(b.key) || a.id.localeCompare(b.id));
  }, [flags, search, scopeFilter, enabledFilter]);

  const handleToggle = (flag: FeatureFlagDto) => {
    if (flag.key.includes('BILLING') && !flag.enabled) {
      const ok = window.confirm(
        'Ativar cobrança/checkout pode impactar usuários. Confirmar?'
      );
      if (!ok) return;
    }
    updateMutation.mutate({ id: flag.id, enabled: !flag.enabled });
  };

  const handleCreate = () => {
    setEditingFlag(null);
    setModalOpen(true);
  };

  const handleEdit = (flag: FeatureFlagDto) => {
    setEditingFlag(flag);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingFlag(null);
    queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-adopet-text-secondary">Carregando…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-adopet-accent/10 text-adopet-accent p-4">
        Erro ao carregar feature flags. Verifique a conexão com a API.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-adopet-text-primary">
          Feature Flags
        </h1>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center justify-center rounded-lg bg-adopet-primary px-4 py-2 text-sm font-medium text-white hover:bg-adopet-primary-dark focus:outline-none focus:ring-2 focus:ring-adopet-primary/50"
        >
          Nova flag
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar por key ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-adopet-primary/20 bg-adopet-card px-3 py-2 text-sm text-adopet-text-primary placeholder-adopet-text-secondary focus:border-adopet-primary focus:outline-none focus:ring-1 focus:ring-adopet-primary"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-adopet-text-secondary">Escopo:</span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as FeatureFlagScope | 'ALL')}
            className="rounded-lg border border-adopet-primary/20 bg-adopet-card px-3 py-2 text-sm text-adopet-text-primary"
          >
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-adopet-text-secondary ml-2">Estado:</span>
          <select
            value={enabledFilter}
            onChange={(e) => setEnabledFilter(e.target.value as 'ALL' | 'ON' | 'OFF')}
            className="rounded-lg border border-adopet-primary/20 bg-adopet-card px-3 py-2 text-sm text-adopet-text-primary"
          >
            {ENABLED_FILTER.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-adopet-primary/10 bg-adopet-card">
        <table className="min-w-full divide-y divide-adopet-primary/10">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-adopet-text-secondary uppercase">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-adopet-text-secondary uppercase">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-adopet-text-secondary uppercase">
                Escopo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-adopet-text-secondary uppercase">
                Cidade / Parceiro
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-adopet-text-secondary uppercase">
                Rollout %
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-adopet-text-secondary uppercase">
                Atualizado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-adopet-text-secondary uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adopet-primary/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-adopet-text-secondary">
                  Nenhuma flag encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((flag) => (
                <tr key={flag.id} className="hover:bg-adopet-primary/5">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={flag.enabled}
                      aria-label={flag.enabled ? `Desabilitar ${flag.key}` : `Habilitar ${flag.key}`}
                      disabled={updateMutation.isPending && updateMutation.variables?.id === flag.id}
                      onClick={() => handleToggle(flag)}
                      className={`
                        relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-adopet-primary/50
                        disabled:cursor-not-allowed disabled:opacity-50
                        ${flag.enabled ? 'border-adopet-primary bg-adopet-primary' : 'border-adopet-primary/30 bg-adopet-background'}
                      `}
                    >
                      <span
                        className={`
                          pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                          ${flag.enabled ? 'translate-x-5' : 'translate-x-0'}
                        `}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-adopet-text-primary">{flag.key}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ScopeBadge scope={flag.scope} />
                  </td>
                  <td className="px-4 py-3 text-sm text-adopet-text-secondary">
                    {flag.cityId ?? flag.partnerId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-adopet-text-secondary">
                    {flag.rolloutPercent != null ? `${flag.rolloutPercent}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-adopet-text-secondary">
                    {formatDate(flag.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(flag)}
                      className="text-adopet-primary hover:text-adopet-primary-dark text-sm font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FeatureFlagFormModal
        open={modalOpen}
        onClose={handleModalClose}
        editing={editingFlag}
        onSuccess={() => {
          toast.addToast('success', editingFlag ? 'Flag atualizada.' : 'Flag criada.');
          handleModalClose();
        }}
        onError={(msg) => toast.addToast('error', msg)}
      />
    </div>
  );
}
