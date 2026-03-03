import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/admin';
import { StatCard } from '@/components/StatCard';
import { ButtonLink, Card, PageHeading, Skeleton } from '@/components/ui';

/** Link para detalhamento: número clicável que leva à tela correspondente */
function DetailLink({
  to,
  value,
  className = '',
  title,
}: {
  to: string;
  value: number | string;
  className?: string;
  title?: string;
}) {
  return (
    <Link
      to={to}
      title={title}
      className={`tabular-nums font-medium text-adopet-primary hover:underline focus:outline-none focus:ring-2 focus:ring-adopet-primary/40 rounded ${className}`}
    >
      {value}
    </Link>
  );
}

const speciesLabel: Record<string, string> = { DOG: 'Cachorro', CAT: 'Gato' };
const pubStatusLabel: Record<string, string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado' };
const petStatusLabel: Record<string, string> = { AVAILABLE: 'Disponível', IN_PROCESS: 'Em processo', ADOPTED: 'Adotado' };
const kycLabel: Record<string, string> = {
  PENDING: 'Pendente',
  VERIFIED: 'Verificado',
  REJECTED: 'Rejeitado',
  'Nunca enviou': 'Nunca enviou',
};
const userTypeLabel: Record<string, string> = {
  TUTOR: 'Tutor',
  ONG: 'ONG',
  PARTNER_COMMERCIAL: 'Parceiro comercial',
};

const iconCl = 'w-6 h-6';
const icons = {
  heart: (
    <svg className={iconCl} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  calendar: (
    <svg className={iconCl} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  doc: (
    <svg className={iconCl} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  flag: (
    <svg className={iconCl} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  clock: (
    <svg className={iconCl} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  shield: (
    <svg className={iconCl} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

export function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });
  const { data: usersAggregates } = useQuery({
    queryKey: ['admin', 'reports', 'users-aggregates'],
    queryFn: () => adminApi.getUsersReportAggregates(),
  });
  const { data: petsAggregates } = useQuery({
    queryKey: ['admin', 'reports', 'pets-aggregates'],
    queryFn: () => adminApi.getPetsReportAggregates(),
  });
  const { data: adoptionsAggregates } = useQuery({
    queryKey: ['admin', 'reports', 'adoptions-aggregates'],
    queryFn: () => adminApi.getAdoptionsReportAggregates(),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeading
          title="Dashboard"
          description="Visão geral e ações rápidas do painel."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-adopet-accent/10 text-adopet-accent p-4">
        Erro ao carregar estatísticas. Verifique a conexão.
      </div>
    );
  }

  const s = stats ?? {
    totalAdoptions: 0,
    adoptionsThisMonth: 0,
    pendingPetsCount: 0,
    pendingReportsCount: 0,
    pendingAdoptionsByTutorCount: 0,
    pendingVerificationsCount: 0,
    pendingKycCount: 0,
  };

  const hasPending =
    s.pendingPetsCount > 0 ||
    s.pendingReportsCount > 0 ||
    s.pendingVerificationsCount > 0 ||
    s.pendingAdoptionsByTutorCount > 0 ||
    (s.pendingKycCount ?? 0) > 0;

  return (
    <div>
      <PageHeading
        title="Dashboard"
        description="Visão geral e ações rápidas do painel."
        action={
          <ButtonLink to="/bulk-import" variant="primary" size="md">
            Upload massivo de pets
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total de adoções" value={s.totalAdoptions} icon={icons.heart} accent="primary" to="/adoptions" />
        <StatCard title="Adoções este mês" value={s.adoptionsThisMonth} icon={icons.calendar} accent="orange" to="/adoptions" />
        <StatCard title="Anúncios pendentes" value={s.pendingPetsCount} icon={icons.doc} accent="primary" to="/pending-pets" />
        <StatCard title="Denúncias pendentes" value={s.pendingReportsCount} icon={icons.flag} accent="accent" to="/reports" />
        <StatCard title="Marcados pelo tutor" value={s.pendingAdoptionsByTutorCount} icon={icons.clock} accent="orange" to="/pending-adoptions-by-tutor" />
        <StatCard title="Verificações pendentes" value={s.pendingVerificationsCount} icon={icons.shield} accent="primary" to="/verifications" />
        <StatCard title="KYC pendentes" value={s.pendingKycCount ?? 0} icon={icons.shield} accent="orange" to="/pending-kyc" />
      </div>
      {hasPending ? (
        <Card>
          <h2 className="font-display font-semibold text-adopet-text-primary mb-4">Revisar pendentes</h2>
          <div className="flex flex-wrap gap-3">
            {s.pendingPetsCount > 0 && (
              <ButtonLink to="/pending-pets" variant="primary" size="sm">
                Anúncios ({s.pendingPetsCount})
              </ButtonLink>
            )}
            {s.pendingReportsCount > 0 && (
              <ButtonLink to="/reports" variant="destructive" size="sm">
                Denúncias ({s.pendingReportsCount})
              </ButtonLink>
            )}
            {s.pendingVerificationsCount > 0 && (
              <ButtonLink to="/verifications" variant="warning" size="sm">
                Verificações ({s.pendingVerificationsCount})
              </ButtonLink>
            )}
            {(s.pendingKycCount ?? 0) > 0 && (
              <ButtonLink to="/pending-kyc" variant="warning" size="sm">
                KYC ({s.pendingKycCount})
              </ButtonLink>
            )}
            {s.pendingAdoptionsByTutorCount > 0 && (
              <ButtonLink to="/pending-adoptions-by-tutor" variant="primary" size="sm">
                Marcados pelo tutor ({s.pendingAdoptionsByTutorCount})
              </ButtonLink>
            )}
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-adopet-text-secondary">Nada pendente para revisar no momento.</p>
        </Card>
      )}

      {(usersAggregates || petsAggregates || adoptionsAggregates) && (
        <>
          <h2 className="font-display font-semibold text-adopet-text-primary mt-10 mb-5 text-lg">Números absolutos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {usersAggregates && (
              <Card className="overflow-hidden">
                <div className="border-b border-adopet-primary/10 pb-4 mb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-adopet-text-secondary mb-1">Usuários cadastrados</p>
                  <p className="text-3xl font-display font-bold text-adopet-primary tabular-nums">
                    <DetailLink to="/users" value={usersAggregates.total} title="Ver lista de usuários" className="text-inherit" />
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-adopet-text-secondary mb-2">Por tipo</p>
                  <div className="flex flex-wrap gap-2">
                    {(['TUTOR', 'ONG', 'PARTNER_COMMERCIAL'] as const).map((key) => {
                      const value = usersAggregates.byUserType?.[key] ?? 0;
                      const to = key === 'TUTOR' ? '/users' : key === 'ONG' ? '/partners' : '/partners';
                      return (
                        <Link
                          key={key}
                          to={to}
                          title={`Ver ${userTypeLabel[key] ?? key}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-adopet-primary/5 px-3 py-1.5 border border-adopet-primary/10 hover:bg-adopet-primary/10 transition-colors"
                        >
                          <span className="text-sm text-adopet-text-secondary">{userTypeLabel[key] ?? key}</span>
                          <span className="text-sm font-semibold text-adopet-text-primary tabular-nums">{value}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-adopet-text-secondary">Com anúncios</span>
                    <DetailLink to="/users" value={usersAggregates.withListings} title="Ver usuários com anúncios" />
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-adopet-text-secondary">Sem anúncios</span>
                    <DetailLink to="/users" value={usersAggregates.withoutListings} title="Ver usuários sem anúncios" />
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-adopet-text-secondary">Desativados / banidos</span>
                    <DetailLink to="/users" value={usersAggregates.deactivated} title="Ver usuários desativados" />
                  </div>
                </div>
                {usersAggregates.byKycStatus && Object.keys(usersAggregates.byKycStatus).length > 0 && (
                  <div className="pt-4 mt-4 border-t border-adopet-primary/10">
                    <p className="text-xs font-medium text-adopet-text-secondary mb-2">Por KYC</p>
                    <div className="space-y-1.5">
                      {Object.entries(usersAggregates.byKycStatus).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-adopet-text-secondary">{kycLabel[k] ?? k}</span>
                          <DetailLink
                            to={k === 'PENDING' ? '/pending-kyc' : '/users'}
                            value={v}
                            title={k === 'PENDING' ? 'Ver KYC pendentes' : `Ver usuários - KYC ${kycLabel[k] ?? k}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
            {petsAggregates && (
              <Card className="overflow-hidden">
                <div className="border-b border-adopet-primary/10 pb-4 mb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-adopet-text-secondary mb-1">Anúncios (pets)</p>
                  <p className="text-3xl font-display font-bold text-adopet-primary tabular-nums">
                    <DetailLink to="/relatorios" value={petsAggregates.total} title="Ver relatórios de anúncios" className="text-inherit" />
                  </p>
                </div>
                {petsAggregates.byStatus && Object.keys(petsAggregates.byStatus).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-adopet-text-secondary mb-2">Por status</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(petsAggregates.byStatus).map(([k, v]) => (
                        <Link
                          key={k}
                          to="/relatorios"
                          title={`Ver anúncios - ${petStatusLabel[k] ?? k}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-adopet-primary/5 px-3 py-1.5 border border-adopet-primary/10 hover:bg-adopet-primary/10 transition-colors"
                        >
                          <span className="text-sm text-adopet-text-secondary">{petStatusLabel[k] ?? k}</span>
                          <span className="text-sm font-semibold tabular-nums">{v}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {petsAggregates.byPublicationStatus && Object.keys(petsAggregates.byPublicationStatus).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-adopet-text-secondary mb-2">Por publicação</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(petsAggregates.byPublicationStatus).map(([k, v]) => (
                        <Link
                          key={k}
                          to={k === 'PENDING' ? '/pending-pets' : '/relatorios'}
                          title={k === 'PENDING' ? 'Ver anúncios pendentes' : `Ver relatórios - ${pubStatusLabel[k] ?? k}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-adopet-primary/5 px-3 py-1.5 border border-adopet-primary/10 hover:bg-adopet-primary/10 transition-colors"
                        >
                          <span className="text-sm text-adopet-text-secondary">{pubStatusLabel[k] ?? k}</span>
                          <span className="text-sm font-semibold tabular-nums">{v}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {petsAggregates.bySpecies && Object.keys(petsAggregates.bySpecies).length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-adopet-text-secondary mb-2">Por espécie</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(petsAggregates.bySpecies).map(([k, v]) => (
                        <Link
                          key={k}
                          to="/relatorios"
                          title={`Ver relatórios - ${speciesLabel[k] ?? k}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-adopet-primary/5 px-3 py-1.5 border border-adopet-primary/10 hover:bg-adopet-primary/10 transition-colors"
                        >
                          <span className="text-sm text-adopet-text-secondary">{speciesLabel[k] ?? k}</span>
                          <span className="text-sm font-semibold tabular-nums">{v}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
            {adoptionsAggregates && (
              <Card className="overflow-hidden">
                <div className="border-b border-adopet-primary/10 pb-4 mb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-adopet-text-secondary mb-1">Adoções</p>
                  <p className="text-3xl font-display font-bold text-adopet-primary tabular-nums">
                    <DetailLink to="/adoptions" value={adoptionsAggregates.total} title="Ver lista de adoções" className="text-inherit" />
                  </p>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-adopet-text-secondary">Confirmadas pela Adopet</span>
                    <DetailLink to="/adoptions" value={adoptionsAggregates.confirmedByAdopet} title="Ver adoções confirmadas" />
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-adopet-text-secondary">Não confirmadas</span>
                    <DetailLink to="/adoptions" value={adoptionsAggregates.notConfirmedByAdopet} title="Ver adoções não confirmadas" />
                  </div>
                </div>
                {adoptionsAggregates.bySpecies && Object.keys(adoptionsAggregates.bySpecies).length > 0 && (
                  <div className="pt-4 border-t border-adopet-primary/10">
                    <p className="text-xs font-medium text-adopet-text-secondary mb-2">Por espécie</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(adoptionsAggregates.bySpecies).map(([k, v]) => (
                        <Link
                          key={k}
                          to="/adoptions"
                          title={`Ver adoções - ${speciesLabel[k] ?? k}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-adopet-primary/5 px-3 py-1.5 border border-adopet-primary/10 hover:bg-adopet-primary/10 transition-colors"
                        >
                          <span className="text-sm text-adopet-text-secondary">{speciesLabel[k] ?? k}</span>
                          <span className="text-sm font-semibold tabular-nums">{v}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
