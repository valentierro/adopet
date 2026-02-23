import { useState, useEffect } from 'react';
import { adminApi, type FeatureFlagDto, type FeatureFlagScope } from '@/api/admin';

const SCOPES: { value: FeatureFlagScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'CITY', label: 'Cidade' },
  { value: 'PARTNER', label: 'Parceiro' },
];

type FormState = {
  key: string;
  enabled: boolean;
  scope: FeatureFlagScope;
  description: string;
  rolloutPercent: string;
  cityId: string;
  partnerId: string;
};

const emptyForm: FormState = {
  key: '',
  enabled: false,
  scope: 'GLOBAL',
  description: '',
  rolloutPercent: '',
  cityId: '',
  partnerId: '',
};

type Props = {
  open: boolean;
  onClose: () => void;
  editing: FeatureFlagDto | null;
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function FeatureFlagFormModal({
  open,
  onClose,
  editing,
  onSuccess,
  onError,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isCreate = !editing;

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          key: editing.key,
          enabled: editing.enabled,
          scope: (editing.scope as FeatureFlagScope) || 'GLOBAL',
          description: editing.description ?? '',
          rolloutPercent:
            editing.rolloutPercent != null ? String(editing.rolloutPercent) : '',
          cityId: editing.cityId ?? '',
          partnerId: editing.partnerId ?? '',
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [open, editing]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (isCreate && !form.key.trim()) e.key = 'Key é obrigatória.';
    if (form.scope === 'CITY' && !form.cityId.trim()) e.cityId = 'Cidade é obrigatória quando escopo é Cidade.';
    if (form.scope === 'PARTNER' && !form.partnerId.trim())
      e.partnerId = 'ID do parceiro é obrigatório quando escopo é Parceiro.';
    const pct = form.rolloutPercent.trim();
    if (pct) {
      const n = parseInt(pct, 10);
      if (Number.isNaN(n) || n < 0 || n > 100) e.rolloutPercent = 'Rollout deve ser entre 0 e 100.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (
      form.key.includes('BILLING') &&
      form.enabled &&
      editing &&
      !editing.enabled
    ) {
      const ok = window.confirm(
        'Ativar cobrança/checkout pode impactar usuários. Confirmar?'
      );
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      const rollout =
        form.rolloutPercent.trim() === ''
          ? undefined
          : Math.min(100, Math.max(0, parseInt(form.rolloutPercent, 10) || 0));
      const payload = {
        enabled: form.enabled,
        scope: form.scope,
        description: form.description.trim() || null,
        rolloutPercent: rollout,
        cityId: form.scope === 'CITY' ? form.cityId.trim() || null : null,
        partnerId: form.scope === 'PARTNER' ? form.partnerId.trim() || null : null,
      };
      if (isCreate) {
        await adminApi.createFeatureFlag({
          key: form.key.trim(),
          ...payload,
        });
      } else {
        await adminApi.updateFeatureFlag(editing.id, payload);
      }
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScopeChange = (scope: FeatureFlagScope) => {
    setForm((prev) => ({
      ...prev,
      scope,
      cityId: scope !== 'CITY' ? '' : prev.cityId,
      partnerId: scope !== 'PARTNER' ? '' : prev.partnerId,
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="feature-flag-modal-title"
        className="relative w-full max-w-lg rounded-xl bg-adopet-card border border-adopet-primary/20 shadow-xl"
      >
        <div className="p-6">
          <h2 id="feature-flag-modal-title" className="text-lg font-semibold text-adopet-text-primary mb-4">
            {isCreate ? 'Nova flag' : 'Editar flag'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-adopet-text-primary mb-1">
                Key
              </label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                disabled={!isCreate}
                placeholder="ex: NGO_PRO_UI_ENABLED"
                className="w-full rounded-lg border border-adopet-primary/20 bg-adopet-background px-3 py-2 text-sm text-adopet-text-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {errors.key && (
                <p className="mt-1 text-sm text-red-600">{errors.key}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ff-enabled"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((p) => ({ ...p, enabled: e.target.checked }))
                }
                className="h-4 w-4 rounded border-adopet-primary/30 text-adopet-primary focus:ring-adopet-primary"
              />
              <label htmlFor="ff-enabled" className="text-sm text-adopet-text-primary">
                Habilitada
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-adopet-text-primary mb-1">
                Escopo
              </label>
              <select
                value={form.scope}
                onChange={(e) =>
                  handleScopeChange(e.target.value as FeatureFlagScope)
                }
                className="w-full rounded-lg border border-adopet-primary/20 bg-adopet-background px-3 py-2 text-sm text-adopet-text-primary"
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {form.scope === 'CITY' && (
              <div>
                <label className="block text-sm font-medium text-adopet-text-primary mb-1">
                  ID ou nome da cidade
                </label>
                <input
                  type="text"
                  value={form.cityId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cityId: e.target.value }))
                  }
                  placeholder="ex: sao-paulo"
                  className="w-full rounded-lg border border-adopet-primary/20 bg-adopet-background px-3 py-2 text-sm text-adopet-text-primary"
                />
                {errors.cityId && (
                  <p className="mt-1 text-sm text-red-600">{errors.cityId}</p>
                )}
              </div>
            )}

            {form.scope === 'PARTNER' && (
              <div>
                <label className="block text-sm font-medium text-adopet-text-primary mb-1">
                  ID do parceiro
                </label>
                <input
                  type="text"
                  value={form.partnerId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, partnerId: e.target.value }))
                  }
                  placeholder="UUID do parceiro"
                  className="w-full rounded-lg border border-adopet-primary/20 bg-adopet-background px-3 py-2 text-sm text-adopet-text-primary"
                />
                {errors.partnerId && (
                  <p className="mt-1 text-sm text-red-600">{errors.partnerId}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-adopet-text-primary mb-1">
                Rollout %{' '}
                <span
                  title="Ativa para X% de usuários/parceiros de forma determinística."
                  className="cursor-help text-adopet-text-secondary"
                >
                  (?)
                </span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.rolloutPercent}
                onChange={(e) =>
                  setForm((p) => ({ ...p, rolloutPercent: e.target.value }))
                }
                placeholder="0-100 ou vazio"
                className="w-full rounded-lg border border-adopet-primary/20 bg-adopet-background px-3 py-2 text-sm text-adopet-text-primary"
              />
              {errors.rolloutPercent && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.rolloutPercent}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-adopet-text-primary mb-1">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
                placeholder="Texto para o admin"
                className="w-full rounded-lg border border-adopet-primary/20 bg-adopet-background px-3 py-2 text-sm text-adopet-text-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-adopet-primary/20 px-4 py-2 text-sm font-medium text-adopet-text-primary hover:bg-adopet-primary/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-adopet-primary px-4 py-2 text-sm font-medium text-white hover:bg-adopet-primary-dark disabled:opacity-50"
              >
                {submitting ? 'Salvando…' : isCreate ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
