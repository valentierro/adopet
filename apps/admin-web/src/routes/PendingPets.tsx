import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type Pet } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/EmptyState';

export function PendingPets() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const { data: pets = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'pending-pets'],
    queryFn: () => adminApi.getPendingPets(),
  });

  const mutation = useMutation({
    mutationFn: async ({ petId, status }: { petId: string; status: 'APPROVED' | 'REJECTED' }) =>
      adminApi.setPetPublication(petId, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSelected(new Set());
      setAction(null);
      toast.addToast('success', status === 'APPROVED' ? 'Anúncio aprovado.' : 'Anúncio rejeitado.');
    },
    onError: () => toast.addToast('error', 'Não foi possível atualizar o anúncio.'),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === pets.length) setSelected(new Set());
    else setSelected(new Set(pets.map((p) => p.id)));
  };

  const applyBatch = async () => {
    if (!action || selected.size === 0) return;
    const list = Array.from(selected);
    const label = action === 'APPROVED' ? 'aprovados' : 'rejeitados';
    try {
      await Promise.all(list.map((petId) => adminApi.setPetPublication(petId, action)));
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSelected(new Set());
      setAction(null);
      toast.addToast('success', `${list.length} anúncio(s) ${label}.`);
    } catch {
      toast.addToast('error', 'Alguns anúncios não puderam ser atualizados.');
    }
  };

  if (isLoading) return <div className="text-adopet-text-secondary">Carregando…</div>;
  if (error) return <div className="rounded-lg bg-adopet-accent/10 text-adopet-accent p-4">Erro ao carregar.</div>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Anúncios pendentes</h1>
      {pets.length === 0 ? (
        <EmptyState message="Nenhum anúncio pendente." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.size === pets.length} onChange={selectAll} className="rounded" />
              <span className="text-sm">Selecionar todos</span>
            </label>
            {selected.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setAction('APPROVED')}
                  className="px-3 py-1.5 rounded-lg bg-adopet-primary text-white text-sm font-medium hover:bg-adopet-primary-dark"
                >
                  Aprovar ({selected.size})
                </button>
                <button
                  type="button"
                  onClick={() => setAction('REJECTED')}
                  className="px-3 py-1.5 rounded-lg bg-adopet-accent text-white text-sm font-medium hover:bg-adopet-accent/90"
                >
                  Rejeitar ({selected.size})
                </button>
                {action && (
                  <button
                    type="button"
                    onClick={applyBatch}
                    disabled={mutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-adopet-orange text-white text-sm font-medium disabled:opacity-50"
                  >
                    {mutation.isPending ? 'Aplicando…' : 'Confirmar'}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header border-b border-adopet-primary/20">
                    <th className="text-left p-3 w-10" />
                    <th className="text-left p-3">Nome</th>
                    <th className="text-left p-3">Espécie</th>
                    <th className="text-left p-3">Tutor</th>
                    <th className="text-left p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pets.map((pet) => (
                    <tr key={pet.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(pet.id)}
                          onChange={() => toggle(pet.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 font-medium">{pet.name}</td>
                      <td className="p-3">{pet.species}</td>
                      <td className="p-3">{(pet as Pet & { owner?: { name: string } }).owner?.name ?? '—'}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => mutation.mutate({ petId: pet.id, status: 'APPROVED' })}
                            disabled={mutation.isPending}
                            className="text-adopet-primary font-medium hover:underline disabled:opacity-50"
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() => mutation.mutate({ petId: pet.id, status: 'REJECTED' })}
                            disabled={mutation.isPending}
                            className="text-adopet-accent font-medium hover:underline disabled:opacity-50"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
