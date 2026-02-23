import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type VerificationItem } from '@/api/admin';
import { useToast } from '@/context/ToastContext';

const APP_BASE_URL = 'https://appadopet.com.br';

function EvidenceLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Foto em tamanho real"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 text-adopet-text-primary hover:bg-white"
        aria-label="Fechar"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-white/90 text-adopet-text-primary text-sm font-medium hover:bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        Abrir em nova aba
      </a>
      <img
        src={url}
        alt="Foto enviada na solicitação"
        className="max-h-[90vh] max-w-full object-contain cursor-default"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' }) {
  const classes =
    variant === 'success'
      ? 'bg-green-600/20 text-green-700 dark:text-green-300'
      : variant === 'warning'
        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
        : 'bg-adopet-primary/15 text-adopet-primary';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${classes}`}>{children}</span>;
}

function PendingCard({
  item,
  onApprove,
  onReject,
  pending,
}: {
  item: VerificationItem;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const [evidenceFullSizeUrl, setEvidenceFullSizeUrl] = useState<string | null>(null);
  const hasEvidence = item.evidenceUrls && item.evidenceUrls.length > 0;
  const skipReason = item.skipEvidenceReason;
  const isUser = item.type === 'USER_VERIFIED';

  return (
    <>
    <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden flex flex-col">
      <div className="p-4 flex flex-col sm:flex-row gap-4">
        {/* Cabeçalho: tipo + data */}
        <div className="flex items-start justify-between gap-2 sm:order-first">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge>{isUser ? 'Verificação de perfil' : 'Verificação de pet'}</Badge>
            <span className="text-adopet-text-secondary text-sm">
              {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Conteúdo principal: usuário ou pet */}
        <div className="flex gap-4 flex-1 min-w-0">
          {isUser ? (
            <>
              <a
                href={`${APP_BASE_URL}/user/${item.userId ?? ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg overflow-hidden w-16 h-16 bg-adopet-background border border-adopet-primary/20 hover:opacity-90"
              >
                {item.userAvatarUrl ? (
                  <img src={item.userAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-adopet-text-secondary text-2xl font-bold">
                    {(item.userName ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </a>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-adopet-text-primary truncate">{item.userName ?? '—'}</p>
                {item.userCity && <p className="text-sm text-adopet-text-secondary">{item.userCity}</p>}
                {item.userUsername && (
                  <p className="text-sm text-adopet-text-secondary">@{item.userUsername}</p>
                )}
                <a
                  href={`${APP_BASE_URL}/user/${item.userId ?? ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-adopet-primary/15 text-adopet-primary text-sm font-medium hover:bg-adopet-primary/25"
                >
                  Visitar perfil de quem solicitou →
                </a>
                <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                  <span className="text-xs text-adopet-text-secondary mr-1">Badges:</span>
                  {item.userVerified ? <Badge variant="success">Verificado</Badge> : null}
                  {item.userOngMember ? <Badge>Membro de ONG</Badge> : null}
                  {item.userTutorTitle ? <Badge>{item.userTutorTitle}</Badge> : item.userId ? <span className="text-xs text-adopet-text-secondary">—</span> : null}
                </div>
              </div>
            </>
          ) : (
            <>
              <a
                href={`${APP_BASE_URL}/pet/${item.petId ?? ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg overflow-hidden w-20 h-20 bg-adopet-background border border-adopet-primary/20 hover:opacity-90"
              >
                {item.petPhotoUrl ? (
                  <img src={item.petPhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-adopet-text-secondary text-2xl">
                    🐾
                  </div>
                )}
              </a>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-adopet-text-primary truncate">{item.petName ?? '—'}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.petSpecies && (
                    <Badge>{item.petSpecies === 'dog' ? 'Cachorro' : 'Gato'}</Badge>
                  )}
                  {item.petAge != null && <Badge>{item.petAge} ano(s)</Badge>}
                  {item.petSex && <Badge>{item.petSex === 'male' ? 'Macho' : 'Fêmea'}</Badge>}
                  {item.petVaccinated === true && <Badge variant="success">Vacinado</Badge>}
                  {item.petVaccinated === false && <Badge variant="warning">Não vacinado</Badge>}
                  {item.petNeutered === true && <Badge variant="success">Castrado</Badge>}
                  {item.petNeutered === false && <Badge variant="warning">Não castrado</Badge>}
                </div>
                {item.petOwnerName && (
                  <p className="text-sm text-adopet-text-secondary mt-1">Tutor: {item.petOwnerName}</p>
                )}
                <a
                  href={`${APP_BASE_URL}/pet/${item.petId ?? ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-adopet-primary/15 text-adopet-primary text-sm font-medium hover:bg-adopet-primary/25"
                >
                  Ver pet no app →
                </a>
                {item.userId && (
                  <a
                    href={`${APP_BASE_URL}/user/${item.userId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 ml-2 px-3 py-1.5 rounded-lg bg-adopet-primary/15 text-adopet-primary text-sm font-medium hover:bg-adopet-primary/25"
                  >
                    Visitar perfil do tutor →
                  </a>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                  <span className="text-xs text-adopet-text-secondary mr-1">Badges:</span>
                  {item.userVerified ? <Badge variant="success">Verificado</Badge> : null}
                  {item.userOngMember ? <Badge>Membro de ONG</Badge> : null}
                  {item.userTutorTitle ? <Badge>{item.userTutorTitle}</Badge> : item.userId ? <span className="text-xs text-adopet-text-secondary">—</span> : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Evidências */}
      <div className="px-4 pb-3">
        {hasEvidence ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap items-start">
              {item.evidenceUrls!.map((url, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEvidenceFullSizeUrl(url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEvidenceFullSizeUrl(url);
                      }
                    }}
                    className={`rounded-lg border-2 border-adopet-primary/40 overflow-hidden bg-adopet-background hover:border-adopet-primary cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-adopet-primary focus:ring-offset-2 ${i === 0 ? 'ring-2 ring-adopet-primary/50' : ''}`}
                    title="Clique para ampliar"
                  >
                    <img
                      src={url}
                      alt={`Evidência ${i + 1}`}
                      className={`block object-cover ${i === 0 ? 'w-40 h-40 sm:w-52 sm:h-52' : 'w-24 h-24 sm:w-28 sm:h-28'}`}
                      draggable={false}
                    />
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-adopet-primary font-medium hover:underline"
                  >
                    Abrir evidência {i + 1} em tamanho real →
                  </a>
                </div>
              ))}
            </div>
            <span className="text-xs text-adopet-text-secondary">Clique na foto para ampliar ou use o link para abrir em nova aba.</span>
          </div>
        ) : skipReason ? (
          <p className="text-adopet-text-secondary text-xs italic" title={skipReason}>
            Sem fotos: {skipReason.slice(0, 60)}{skipReason.length > 60 ? '…' : ''}
          </p>
        ) : null}
      </div>

      {/* Ações */}
      <div className="px-4 py-3 bg-adopet-background/50 border-t border-adopet-primary/10 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onApprove}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-adopet-primary text-white text-sm font-medium hover:bg-adopet-primary-dark disabled:opacity-50"
        >
          Aprovar
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-adopet-accent text-white text-sm font-medium hover:bg-adopet-accent/90 disabled:opacity-50"
        >
          Rejeitar
        </button>
      </div>
    </div>
    {evidenceFullSizeUrl && (
      <EvidenceLightbox url={evidenceFullSizeUrl} onClose={() => setEvidenceFullSizeUrl(null)} />
    )}
    </>
  );
}

function VerificationRow({
  item,
  onApprove,
  onReject,
  onRevoke,
  onOpenEvidence,
  isRevokable,
  pending,
}: {
  item: VerificationItem;
  onApprove: () => void;
  onReject: () => void;
  onRevoke?: () => void;
  onOpenEvidence: (url: string) => void;
  isRevokable?: boolean;
  pending: boolean;
}) {
  const hasEvidence = item.evidenceUrls && item.evidenceUrls.length > 0;
  const skipReason = item.skipEvidenceReason;
  return (
    <tr className="border-b border-adopet-primary/10 hover:bg-adopet-background/50">
      <td className="p-3">{item.type}</td>
      <td className="p-3">
        <span>{item.petName ?? item.userName ?? '—'}</span>
        {(item.userVerified || item.userOngMember || item.userTutorTitle) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.userVerified && <Badge variant="success">Verificado</Badge>}
            {item.userOngMember && <Badge>Membro de ONG</Badge>}
            {item.userTutorTitle && <Badge>{item.userTutorTitle}</Badge>}
          </div>
        )}
      </td>
      <td className="p-3">
        {hasEvidence ? (
          <div className="flex gap-1 flex-wrap">
            {item.evidenceUrls!.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onOpenEvidence(url)}
                className="inline-block w-12 h-12 rounded border border-adopet-primary/30 overflow-hidden bg-adopet-background hover:opacity-90 focus:ring-2 focus:ring-adopet-primary/50"
                title="Abrir em tamanho real"
              >
                <img src={url} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : skipReason ? (
          <span className="text-adopet-text-secondary text-xs italic" title={skipReason}>
            Sem fotos: {skipReason.slice(0, 40)}{skipReason.length > 40 ? '…' : ''}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="p-3">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
      <td className="p-3">
        <div className="flex gap-2 flex-wrap">
          {item.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={pending}
                className="text-adopet-primary font-medium hover:underline disabled:opacity-50"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={pending}
                className="text-adopet-accent font-medium hover:underline disabled:opacity-50"
              >
                Rejeitar
              </button>
            </>
          )}
          {isRevokable && onRevoke && (
            <button
              type="button"
              onClick={onRevoke}
              disabled={pending}
              className="text-adopet-orange font-medium hover:underline disabled:opacity-50"
            >
              Revogar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function Verifications() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');
  const [tableEvidenceFullSizeUrl, setTableEvidenceFullSizeUrl] = useState<string | null>(null);

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin', 'verifications', 'pending'],
    queryFn: () => adminApi.getPendingVerifications(),
  });
  const { data: approved = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['admin', 'verifications', 'approved'],
    queryFn: () => adminApi.getApprovedVerifications(),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      adminApi.resolveVerification(id, status, rejectionReason),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.addToast('success', status === 'APPROVED' ? 'Verificação aprovada.' : 'Verificação rejeitada.');
    },
    onError: () => toast.addToast('error', 'Não foi possível atualizar a verificação.'),
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminApi.revokeVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.addToast('success', 'Verificação revogada.');
    },
    onError: () => toast.addToast('error', 'Não foi possível revogar.'),
  });

  const loading = tab === 'pending' ? loadingPending : loadingApproved;
  const list = tab === 'pending' ? pending : approved;
  const pendingActionsDisabled = resolveMutation.isPending || revokeMutation.isPending;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-4">Verificações</h1>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${
            tab === 'pending' ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
          }`}
        >
          Pendentes ({pending.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('approved')}
          className={`px-4 py-2 rounded-lg font-medium ${
            tab === 'approved' ? 'bg-adopet-primary text-white' : 'bg-adopet-card border border-adopet-primary/20'
          }`}
        >
          Aprovadas ({approved.length})
        </button>
      </div>
      {loading ? (
        <div className="text-adopet-text-secondary">Carregando…</div>
      ) : tab === 'pending' && pending.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((item) => (
            <PendingCard
              key={item.id}
              item={item}
              pending={pendingActionsDisabled}
              onApprove={() => resolveMutation.mutate({ id: item.id, status: 'APPROVED' })}
              onReject={() => {
                const reason = window.prompt('Motivo da rejeição (opcional):');
                resolveMutation.mutate({
                  id: item.id,
                  status: 'REJECTED',
                  rejectionReason: reason?.trim() || undefined,
                });
              }}
            />
          ))}
        </div>
      ) : tab === 'approved' || (tab === 'pending' && pending.length === 0) ? (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 overflow-hidden">
          {list.length === 0 ? (
            <div className="p-6 text-center text-adopet-text-secondary">
              Nenhum item.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header border-b border-adopet-primary/20">
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Pet / Usuário</th>
                    <th className="text-left p-3">Evidências</th>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <VerificationRow
                      key={item.id}
                      item={item}
                      isRevokable={tab === 'approved'}
                      pending={pendingActionsDisabled}
                      onOpenEvidence={setTableEvidenceFullSizeUrl}
                      onApprove={() => resolveMutation.mutate({ id: item.id, status: 'APPROVED' })}
                      onReject={() => {
                        const reason = window.prompt('Motivo da rejeição (opcional):');
                        resolveMutation.mutate({
                          id: item.id,
                          status: 'REJECTED',
                          rejectionReason: reason?.trim() || undefined,
                        });
                      }}
                      onRevoke={() => revokeMutation.mutate(item.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
      {tableEvidenceFullSizeUrl && (
        <EvidenceLightbox url={tableEvidenceFullSizeUrl} onClose={() => setTableEvidenceFullSizeUrl(null)} />
      )}
    </div>
  );
}
