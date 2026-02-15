import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

export function Users() {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.searchUsers(search),
    enabled: search.length >= 2,
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Usuários</h1>
      <div className="mb-4 max-w-md">
        <label className="block text-sm font-medium mb-1">Buscar por nome ou e-mail</label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Digite ao menos 2 caracteres"
          className="w-full px-4 py-2 rounded-lg border border-adopet-primary/30"
        />
      </div>
      {search.length > 0 && search.length < 2 && (
        <p className="text-adopet-text-secondary text-sm">Digite ao menos 2 caracteres para buscar.</p>
      )}
      {search.length >= 2 && (
        <>
          {isLoading || isFetching ? (
            <div className="text-adopet-text-secondary">Buscando…</div>
          ) : (
            <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-adopet-header border-b border-adopet-primary/20">
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">E-mail</th>
                      <th className="text-left p-3">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-adopet-text-secondary">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                          <td className="p-3 font-medium">{u.name}</td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3 text-adopet-text-secondary font-mono text-xs">{u.id}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
