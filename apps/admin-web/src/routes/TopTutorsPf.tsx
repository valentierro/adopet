import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type TopTutorPfItem } from '@/api/admin';
import { downloadCsv } from '@/utils/exportReports';

export function TopTutorsPf() {
  const [limit, setLimit] = useState(50);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['admin', 'top-tutors-pf', limit],
    queryFn: () => adminApi.getTopTutorsPf(limit),
  });

  const handleExportCsv = () => {
    const headers = ['Nome', 'E-mail', 'Username', 'Adoções'];
    const rows = list.map((t) => [
      t.name,
      t.email,
      t.username ?? '—',
      String(t.adoptionCount),
    ]);
    downloadCsv(
      `top-tutores-pf-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">
        Top tutores PF
      </h1>
      <p className="text-adopet-text-secondary mb-4">
        Tutores pessoa física (sem conta parceiro) com mais adoções nos últimos 12 meses. Possível
        red flag para investigação.
      </p>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2">
          <span className="text-sm">Limite:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-adopet-primary/30"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={list.length === 0}
          className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      {isLoading ? (
        <div className="text-adopet-text-secondary">Carregando…</div>
      ) : list.length === 0 ? (
        <p className="text-adopet-text-secondary">Nenhum tutor PF com adoções.</p>
      ) : (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adopet-header border-b border-adopet-primary/20">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">Username</th>
                  <th className="text-left p-3">Adoções</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t: TopTutorPfItem) => (
                  <tr
                    key={t.userId}
                    className="border-b border-adopet-primary/10 hover:bg-adopet-background/50"
                  >
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3">{t.email}</td>
                    <td className="p-3">{t.username ?? '—'}</td>
                    <td className="p-3 font-medium">{t.adoptionCount}</td>
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
