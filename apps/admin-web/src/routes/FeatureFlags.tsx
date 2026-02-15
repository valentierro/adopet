import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { useToast } from '@/context/ToastContext';

export function FeatureFlags() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: flags = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => adminApi.getFeatureFlags(),
  });

  const setFlag = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      adminApi.setFeatureFlag(key, enabled),
    onSuccess: (_, { key, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.addToast('success', `Feature "${key}" ${enabled ? 'habilitada' : 'desabilitada'}.`);
    },
    onError: (err: Error) => toast.addToast('error', err.message || 'Erro ao atualizar.'),
  });

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
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-2">Feature flags</h1>
      <p className="text-adopet-text-secondary mb-6">
        Habilitar ou desabilitar funcionalidades da aplicação. As flags são criadas no banco sob demanda ao ligar/desligar.
      </p>
      {flags.length === 0 ? (
        <div className="rounded-xl border border-adopet-primary/10 bg-adopet-card p-6 text-center">
          <p className="text-adopet-text-secondary">
            Nenhuma feature flag cadastrada. Use a API ou o banco para criar flags (ex.: require_email_verification).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-adopet-primary/10 bg-adopet-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-adopet-text-primary">{flag.key}</p>
                {flag.description && (
                  <p className="text-sm text-adopet-text-secondary mt-0.5">{flag.description}</p>
                )}
              </div>
              <label className="flex shrink-0 items-center gap-2 cursor-pointer">
                <span className="text-sm text-adopet-text-secondary">
                  {flag.enabled ? 'Ligada' : 'Desligada'}
                </span>
                <input
                  type="checkbox"
                  checked={flag.enabled}
                  disabled={setFlag.isPending && setFlag.variables?.key === flag.key}
                  onChange={(e) => setFlag.mutate({ key: flag.key, enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-2 border-adopet-primary/40 bg-adopet-background text-adopet-primary focus:ring-2 focus:ring-adopet-primary/50 disabled:opacity-50"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
