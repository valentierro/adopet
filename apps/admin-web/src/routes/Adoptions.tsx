import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdoptionItem, type PetAvailableItem, type UserSearchItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/EmptyState';
import { PaginationBar } from '@/components/PaginationBar';

const PAGE_SIZE = 15;

function downloadCsv(adoptions: AdoptionItem[]) {
  const headers = ['Pet', 'Tutor', 'Adotante', 'Data', 'Confirmado pela Adopet'];
  const rows = adoptions.map((a) => [
    a.petName,
    a.tutorName,
    a.adopterName,
    new Date(a.adoptedAt).toLocaleDateString('pt-BR'),
    a.confirmedByAdopet ? 'Sim' : 'Não',
  ]);
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adocoes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Adoptions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [petId, setPetId] = useState('');
  const [adopterSearch, setAdopterSearch] = useState('');
  const [selectedAdopter, setSelectedAdopter] = useState<UserSearchItem | null>(null);
  const [page, setPage] = useState(1);

  const { data: adoptions = [], isLoading } = useQuery({
    queryKey: ['admin', 'adoptions'],
    queryFn: () => adminApi.getAdoptions(),
  });
  const { data: petsAvailable = [] } = useQuery({
    queryKey: ['admin', 'pets-available'],
    queryFn: () => adminApi.getPetsAvailable(),
    enabled: showForm,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users', adopterSearch],
    queryFn: () => adminApi.searchUsers(adopterSearch),
    enabled: showForm && adopterSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createAdoption(petId, selectedAdopter?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pets-available'] });
      setShowForm(false);
      setPetId('');
      setSelectedAdopter(null);
      setAdopterSearch('');
      toast.addToast('success', 'Adoção registrada.');
    },
    onError: () => toast.addToast('error', 'Não foi possível registrar a adoção.'),
  });
  const confirmMutation = useMutation({
    mutationFn: (id: string) => adminApi.confirmAdoptionByAdopet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      toast.addToast('success', 'Adoção confirmada pela Adopet.');
    },
    onError: () => toast.addToast('error', 'Não foi possível confirmar.'),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectAdoptionByAdopet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      toast.addToast('success', 'Adoção rejeitada pela Adopet.');
    },
    onError: () => toast.addToast('error', 'Não foi possível rejeitar.'),
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Adoções</h1>
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium hover:bg-adopet-primary-dark"
        >
          {showForm ? 'Cancelar' : 'Registrar adoção'}
        </button>
        {adoptions.length > 0 && (
          <button
            type="button"
            onClick={() => downloadCsv(adoptions)}
            className="px-4 py-2 rounded-lg border border-adopet-primary/30 font-medium hover:bg-adopet-primary/10"
          >
            Exportar CSV
          </button>
        )}
      </div>
      {showForm && (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-6 mb-6">
          <h2 className="font-semibold text-adopet-text-primary mb-4">Nova adoção</h2>
          <div className="grid gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Pet</label>
              <select
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30"
              >
                <option value="">Selecione</option>
                {(petsAvailable as PetAvailableItem[]).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (tutor: {p.ownerName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adotante (buscar por nome ou e-mail)</label>
              <input
                type="text"
                value={adopterSearch}
                onChange={(e) => { setAdopterSearch(e.target.value); setSelectedAdopter(null); }}
                placeholder="Digite para buscar"
                className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30"
              />
              {users.length > 0 && !selectedAdopter && (
                <ul className="mt-1 border rounded-lg overflow-hidden">
                  {users.slice(0, 5).map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedAdopter(u); setAdopterSearch(u.name); }}
                        className="w-full text-left px-3 py-2 hover:bg-adopet-background"
                      >
                        {u.name} — {u.email}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedAdopter && (
                <p className="mt-1 text-sm text-adopet-primary">
                  Adotante: {selectedAdopter.name} ({selectedAdopter.email})
                  <button type="button" onClick={() => { setSelectedAdopter(null); setAdopterSearch(''); }} className="ml-2 text-adopet-accent">Remover</button>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!petId || createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? 'Salvando…' : 'Registrar'}
            </button>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="text-adopet-text-secondary">Carregando…</div>
      ) : adoptions.length === 0 ? (
        <EmptyState message="Nenhuma adoção registrada." />
      ) : (
        <>
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header border-b border-adopet-primary/20">
                    <th className="text-left p-3">Pet</th>
                    <th className="text-left p-3">Tutor</th>
                    <th className="text-left p-3">Adotante</th>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Confirmado Adopet</th>
                    <th className="text-left p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {adoptions
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((a: AdoptionItem) => (
                    <tr key={a.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                      <td className="p-3 font-medium">{a.petName}</td>
                      <td className="p-3">{a.tutorName}</td>
                      <td className="p-3">{a.adopterName}</td>
                      <td className="p-3">{new Date(a.adoptedAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">{a.confirmedByAdopet ? 'Sim' : 'Não'}</td>
                      <td className="p-3">
                        {!a.confirmedByAdopet && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmMutation.mutate(a.petId)}
                              disabled={confirmMutation.isPending}
                              className="text-adopet-primary font-medium hover:underline"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectMutation.mutate(a.petId)}
                              disabled={rejectMutation.isPending}
                              className="text-adopet-accent font-medium hover:underline"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          </div>
          <div className="mt-2 px-1">
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={adoptions.length}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
