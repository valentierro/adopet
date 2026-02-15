import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type PendingAdoptionByTutorItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/EmptyState';

export function PendingAdoptionsByTutor() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'pending-adoptions-by-tutor'],
    queryFn: () => adminApi.getPendingAdoptionsByTutor(),
  });

  const rejectMutation = useMutation({
    mutationFn: (petId: string) => adminApi.rejectPendingAdoptionByTutor(petId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-adoptions-by-tutor'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.addToast('success', 'Marcação rejeitada.');
    },
    onError: () => toast.addToast('error', 'Não foi possível rejeitar.'),
  });

  if (isLoading) return <div className="text-adopet-text-secondary">Carregando…</div>;
  if (error) return <div className="rounded-lg bg-adopet-accent/10 text-adopet-accent p-4">Erro ao carregar.</div>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Marcados pelo tutor</h1>
      <p className="text-adopet-text-secondary mb-4 text-sm">
        Pets que o tutor marcou como adotados. Registre a adoção em &quot;Adoções&quot; ou rejeite a marcação.
      </p>
      {list.length === 0 ? (
        <EmptyState message="Nenhum item pendente. Pets marcados pelo tutor como adotados aparecem aqui." />
      ) : (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adopet-header border-b border-adopet-primary/20">
                  <th className="text-left p-3">Pet</th>
                  <th className="text-left p-3">Tutor</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Adotante indicado</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item: PendingAdoptionByTutorItem) => (
                  <tr key={item.petId} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                    <td className="p-3 font-medium">{item.petName}</td>
                    <td className="p-3">{item.tutorName}</td>
                    <td className="p-3">{new Date(item.markedAt).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">{item.pendingAdopterName ?? item.pendingAdopterUsername ?? '—'}</td>
                    <td className="p-3">
                      <a
                        href="/adoptions"
                        className="text-adopet-primary font-medium hover:underline mr-2"
                      >
                        Registrar adoção
                      </a>
                      <button
                        type="button"
                        onClick={() => rejectMutation.mutate(item.petId)}
                        disabled={rejectMutation.isPending}
                        className="text-adopet-accent font-medium hover:underline"
                      >
                        Rejeitar marcação
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
