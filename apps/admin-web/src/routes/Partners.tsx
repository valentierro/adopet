import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type PartnerItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';

export function Partners() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'ONG', name: '', slug: '', city: '', active: true, isPaidPartner: false });

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin', 'partners'],
    queryFn: () => adminApi.getPartners(),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi.createPartner(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      setShowForm(false);
      setForm({ type: 'ONG', name: '', slug: '', city: '', active: true, isPaidPartner: false });
      toast.addToast('success', 'Parceiro cadastrado.');
    },
    onError: () => toast.addToast('error', 'Não foi possível cadastrar o parceiro.'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminApi.updatePartner(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      setEditId(null);
      toast.addToast('success', 'Parceiro atualizado.');
    },
    onError: () => toast.addToast('error', 'Não foi possível atualizar.'),
  });

  const openEdit = (p: PartnerItem) => {
    setEditId(p.id);
    setForm({
      type: p.type,
      name: p.name,
      slug: p.slug,
      city: p.city ?? '',
      active: p.active,
      isPaidPartner: !!p.isPaidPartner,
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Parceiros</h1>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditId(null); setForm({ type: 'ONG', name: '', slug: '', city: '', active: true, isPaidPartner: false }); }}
          className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium hover:bg-adopet-primary-dark"
        >
          Cadastrar parceiro
        </button>
      </div>
      {(showForm || editId) && (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-6 mb-6">
          <h2 className="font-semibold text-adopet-text-primary mb-4">
            {editId ? 'Editar parceiro' : 'Novo parceiro'}
          </h2>
          <div className="grid gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30"
              >
                <option value="ONG">ONG</option>
                <option value="CLINIC">Clínica</option>
                <option value="STORE">Loja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30"
                placeholder="Nome do parceiro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (URL)</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30"
                placeholder="nome-parceiro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30"
                placeholder="Opcional"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <span className="text-sm">Ativo</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPaidPartner}
                onChange={(e) => setForm((f) => ({ ...f, isPaidPartner: e.target.checked }))}
              />
              <span className="text-sm">Parceiro pago</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  editId
                    ? updateMutation.mutate({
                        id: editId,
                        body: {
                          type: form.type,
                          name: form.name,
                          slug: form.slug,
                          city: form.city || undefined,
                          active: form.active,
                          isPaidPartner: form.isPaidPartner,
                        },
                      })
                    : createMutation.mutate({
                        type: form.type,
                        name: form.name,
                        slug: form.slug,
                        city: form.city || undefined,
                        active: form.active,
                        isPaidPartner: form.isPaidPartner,
                      })
                }
                disabled={!form.name || !form.slug || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium disabled:opacity-50"
              >
                {editId ? 'Salvar' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-4 py-2 rounded-lg border border-adopet-primary/30"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="text-adopet-text-secondary">Carregando…</div>
      ) : (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adopet-header border-b border-adopet-primary/20">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Cidade</th>
                  <th className="text-left p-3">Ativo</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p: PartnerItem) => (
                  <tr key={p.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.type}</td>
                    <td className="p-3">{p.slug}</td>
                    <td className="p-3">{p.city ?? '—'}</td>
                    <td className="p-3">{p.active ? 'Sim' : 'Não'}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="text-adopet-primary font-medium hover:underline"
                      >
                        Editar
                      </button>
                    </td>
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
