import { useQuery } from '@tanstack/react-query';
import { adminApi, type PartnerRecommendationItem } from '@/api/admin';
import { EmptyState } from '@/components/EmptyState';

export function PartnerRecommendations() {
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'partner-recommendations'],
    queryFn: () => adminApi.getPartnerRecommendations(),
  });

  if (isLoading) return <div className="text-adopet-text-secondary">Carregando…</div>;
  if (error) return <div className="rounded-lg bg-adopet-accent/10 text-adopet-accent p-4">Erro ao carregar.</div>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Indicações de parceiros</h1>
      <p className="text-adopet-text-secondary mb-4 text-sm">
        Indicações enviadas por usuários. Cadastre em &quot;Parceiros&quot; se aprovado.
      </p>
      {list.length === 0 ? (
        <EmptyState message="Nenhuma indicação de parceiro." />
      ) : (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adopet-header border-b border-adopet-primary/20">
                  <th className="text-left p-3">Quem indicou</th>
                  <th className="text-left p-3">Nome sugerido</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Cidade</th>
                  <th className="text-left p-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item: PartnerRecommendationItem) => (
                  <tr key={item.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                    <td className="p-3">{item.indicadorName ?? '—'}</td>
                    <td className="p-3 font-medium">{item.suggestedName}</td>
                    <td className="p-3">{item.suggestedType}</td>
                    <td className="p-3">{item.suggestedCity ?? '—'}</td>
                    <td className="p-3">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
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
