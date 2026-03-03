import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type PartnerItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { PaginationBar } from '@/components/PaginationBar';

export function Partners() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'ONG', name: '', slug: '', city: '', active: true, isPaidPartner: false });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [showBulkReject, setShowBulkReject] = useState(false);
  const [endId, setEndId] = useState<string | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => adminApi.bulkApprovePartners(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      setSelectedIds(new Set());
      toast.addToast('success', `${data.updated} parceiro(s) aprovado(s).`);
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao aprovar em massa.'),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) =>
      adminApi.bulkRejectPartners(ids, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      setSelectedIds(new Set());
      setShowBulkReject(false);
      setBulkRejectReason('');
      toast.addToast('success', `${data.updated} parceiro(s) rejeitado(s).`);
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao rejeitar em massa.'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => adminApi.resendPartnerConfirmation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      toast.addToast('success', 'E-mail de confirmação reenviado.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao reenviar.'),
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => adminApi.endPartnership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      setEndId(null);
      toast.addToast('success', 'Parceria encerrada.');
    },
    onError: (e) => toast.addToast('error', e instanceof Error ? e.message : 'Erro ao encerrar.'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingPartners = partners.filter((p: PartnerItem) => !p.approvedAt);

  const filtered = useMemo(() => {
    let list = partners;
    const name = filterName.trim().toLowerCase();
    const type = filterType.trim().toLowerCase();
    if (name) list = list.filter((p: PartnerItem) => (p.name ?? '').toLowerCase().includes(name));
    if (type) list = list.filter((p: PartnerItem) => (p.type ?? '').toLowerCase().includes(type));
    return list;
  }, [partners, filterName, filterType]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize),
    [filtered, pageSafe, pageSize]
  );
  const pendingOnPage = paginated.filter((p: PartnerItem) => !p.approvedAt);
  const allPendingOnPageSelected =
    pendingOnPage.length > 0 && pendingOnPage.every((p: PartnerItem) => selectedIds.has(p.id));

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
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditId(null); setForm({ type: 'ONG', name: '', slug: '', city: '', active: true, isPaidPartner: false }); }}
          className="px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium hover:bg-adopet-primary-dark"
        >
          Cadastrar parceiro
        </button>
        {pendingPartners.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => selectedIds.size > 0 && bulkApproveMutation.mutate(Array.from(selectedIds))}
              disabled={selectedIds.size === 0 || bulkApproveMutation.isPending}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
            >
              Aprovar selecionados ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => selectedIds.size > 0 && setShowBulkReject(true)}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
            >
              Rejeitar selecionados ({selectedIds.size})
            </button>
          </>
        )}
      </div>

      {showBulkReject && (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4 mb-4">
          <label className="block text-sm font-medium mb-2">Motivo da rejeição (opcional)</label>
          <input
            type="text"
            value={bulkRejectReason}
            onChange={(e) => setBulkRejectReason(e.target.value)}
            placeholder="Ex: Documentação incompleta"
            className="w-full px-3 py-2 rounded-lg border border-adopet-primary/30 mb-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                bulkRejectMutation.mutate({
                  ids: Array.from(selectedIds),
                  reason: bulkRejectReason.trim() || undefined,
                })
              }
              disabled={bulkRejectMutation.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
            >
              Rejeitar {selectedIds.size} parceiro(s)
            </button>
            <button
              type="button"
              onClick={() => { setShowBulkReject(false); setBulkRejectReason(''); }}
              className="px-4 py-2 rounded-lg border border-adopet-primary/30"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {endId && (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-4 mb-4">
          <p className="text-sm text-adopet-text-secondary mb-2">
            Encerrar parceria desativa o parceiro e cancela assinatura (se pago). Continuar?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => endMutation.mutate(endId)}
              disabled={endMutation.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
            >
              Sim, encerrar
            </button>
            <button
              type="button"
              onClick={() => setEndId(null)}
              className="px-4 py-2 rounded-lg border border-adopet-primary/30"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
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
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="text"
              value={filterName}
              onChange={(e) => { setFilterName(e.target.value); setPage(1); }}
              placeholder="Filtrar por nome..."
              className="px-3 py-1.5 rounded-lg border border-adopet-primary/20 text-sm w-40"
            />
            <input
              type="text"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              placeholder="Filtrar por tipo (ONG, CLINIC...)"
              className="px-3 py-1.5 rounded-lg border border-adopet-primary/20 text-sm w-44"
            />
          </div>
          <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header border-b border-adopet-primary/20">
                    {pendingPartners.length > 0 && (
                      <th className="text-left p-3 w-10">
                        <input
                          type="checkbox"
                          checked={allPendingOnPageSelected}
                          onChange={() => {
                            if (allPendingOnPageSelected) {
                              const next = new Set(selectedIds);
                              pendingOnPage.forEach((x: PartnerItem) => next.delete(x.id));
                              setSelectedIds(next);
                            } else {
                              const next = new Set(selectedIds);
                              pendingOnPage.forEach((x: PartnerItem) => next.add(x.id));
                              setSelectedIds(next);
                            }
                          }}
                          aria-label="Selecionar pendentes da página"
                        />
                      </th>
                    )}
                    <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Cidade</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Ativo</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p: PartnerItem) => (
                  <tr key={p.id} className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
                    {pendingPartners.length > 0 && (
                      <td className="p-3">
                        {!p.approvedAt && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        )}
                      </td>
                    )}
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.type}</td>
                    <td className="p-3">{p.slug}</td>
                    <td className="p-3">{p.city ?? '—'}</td>
                    <td className="p-3">
                      {p.approvedAt ? (
                        <span className="text-green-600">Aprovado</span>
                      ) : (
                        <span className="text-adopet-orange">Pendente</span>
                      )}
                    </td>
                    <td className="p-3">{p.active ? 'Sim' : 'Não'}</td>
                    <td className="p-3 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="text-adopet-primary font-medium hover:underline"
                      >
                        Editar
                      </button>
                      {p.canResendConfirmation && (
                        <button
                          type="button"
                          onClick={() => resendMutation.mutate(p.id)}
                          disabled={resendMutation.isPending}
                          className="text-adopet-primary font-medium hover:underline disabled:opacity-50"
                        >
                          Reenviar e-mail
                        </button>
                      )}
                      {p.active && (
                        <button
                          type="button"
                          onClick={() => setEndId(p.id)}
                          className="text-red-600 font-medium hover:underline"
                        >
                          Encerrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-adopet-primary/10">
            <PaginationBar
              page={pageSafe}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            />
          </div>
        </div>
        </>
      )}
    </div>
  );
}
