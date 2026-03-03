import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  adminApi,
  type SatisfactionStats,
  type SatisfactionResponseItem,
} from '@/api/admin';
import { downloadCsv } from '@/utils/exportReports';

export function Satisfaction() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: stats } = useQuery({
    queryKey: ['admin', 'satisfaction', 'stats'],
    queryFn: () => adminApi.getSatisfactionStats(),
  });

  const { data: responsesData } = useQuery({
    queryKey: ['admin', 'satisfaction', 'responses', page],
    queryFn: () => adminApi.getSatisfactionResponses(page, limit),
  });

  const items: SatisfactionResponseItem[] = responsesData?.items ?? [];
  const total = responsesData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const s = stats as SatisfactionStats | undefined;

  const handleExportCsv = () => {
    if (!s || items.length === 0) return;
    const headers = [
      'Nome',
      'E-mail',
      'Papel',
      'Confiança',
      'Facilidade',
      'Comunicação',
      'Geral',
      'Comentário',
      'Data',
    ];
    const rows = items.map((r) => [
      r.userName,
      r.userEmail,
      r.role,
      String(r.trustScore),
      String(r.easeOfUseScore),
      String(r.communicationScore),
      String(r.overallScore),
      r.comment ?? '—',
      new Date(r.createdAt).toLocaleString('pt-BR'),
    ]);
    downloadCsv(
      `satisfacao-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">
        Pesquisa de satisfação
      </h1>

      {s && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4">
            <p className="text-sm text-adopet-text-secondary">Total de respostas</p>
            <p className="text-2xl font-bold text-adopet-text-primary">{s.totalResponses}</p>
          </div>
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4">
            <p className="text-sm text-adopet-text-secondary">Média confiança</p>
            <p className="text-2xl font-bold text-adopet-text-primary">
              {s.averageTrust.toFixed(1)}
            </p>
          </div>
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4">
            <p className="text-sm text-adopet-text-secondary">Média facilidade</p>
            <p className="text-2xl font-bold text-adopet-text-primary">
              {s.averageEaseOfUse.toFixed(1)}
            </p>
          </div>
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4">
            <p className="text-sm text-adopet-text-secondary">Média geral</p>
            <p className="text-2xl font-bold text-adopet-text-primary">
              {s.averageOverall.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={items.length === 0}
          className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium disabled:opacity-50"
        >
          Exportar CSV (página atual)
        </button>
      </div>

      <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-adopet-header border-b border-adopet-primary/20">
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">E-mail</th>
                <th className="text-left p-3">Papel</th>
                <th className="text-left p-3">Confiança</th>
                <th className="text-left p-3">Facilidade</th>
                <th className="text-left p-3">Comunicação</th>
                <th className="text-left p-3">Geral</th>
                <th className="text-left p-3">Comentário</th>
                <th className="text-left p-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-adopet-text-secondary">
                    Nenhuma resposta de satisfação.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-adopet-primary/10 hover:bg-adopet-background/50"
                  >
                    <td className="p-3 font-medium">{r.userName}</td>
                    <td className="p-3">{r.userEmail}</td>
                    <td className="p-3">{r.role}</td>
                    <td className="p-3">{r.trustScore}</td>
                    <td className="p-3">{r.easeOfUseScore}</td>
                    <td className="p-3">{r.communicationScore}</td>
                    <td className="p-3">{r.overallScore}</td>
                    <td className="p-3 max-w-[200px] truncate">{r.comment ?? '—'}</td>
                    <td className="p-3">{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-adopet-text-secondary">
            {total} resposta(s) — página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg border border-adopet-primary/30 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-lg border border-adopet-primary/30 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
