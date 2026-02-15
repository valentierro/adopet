import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/admin';
import { StatCard } from '@/components/StatCard';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-adopet-text-secondary">Carregando…</div>
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
  };

  const hasPending =
    s.pendingPetsCount > 0 || s.pendingReportsCount > 0 || s.pendingVerificationsCount > 0 || s.pendingAdoptionsByTutorCount > 0;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total de adoções" value={s.totalAdoptions} icon={icons.heart} accent="primary" />
        <StatCard title="Adoções este mês" value={s.adoptionsThisMonth} icon={icons.calendar} accent="orange" />
        <StatCard title="Anúncios pendentes" value={s.pendingPetsCount} icon={icons.doc} accent="primary" />
        <StatCard title="Denúncias pendentes" value={s.pendingReportsCount} icon={icons.flag} accent="accent" />
        <StatCard title="Marcados pelo tutor" value={s.pendingAdoptionsByTutorCount} icon={icons.clock} accent="orange" />
        <StatCard title="Verificações pendentes" value={s.pendingVerificationsCount} icon={icons.shield} accent="primary" />
      </div>
      {hasPending ? (
        <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-6 mb-6">
          <h2 className="font-display font-semibold text-adopet-text-primary mb-4">Revisar pendentes</h2>
          <div className="flex flex-wrap gap-3">
            {s.pendingPetsCount > 0 && (
              <Link
                to="/pending-pets"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-adopet-primary text-white font-medium hover:bg-adopet-primary-dark"
              >
                Anúncios ({s.pendingPetsCount})
              </Link>
            )}
            {s.pendingReportsCount > 0 && (
              <Link
                to="/reports"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-adopet-accent/90 text-white font-medium hover:bg-adopet-accent"
              >
                Denúncias ({s.pendingReportsCount})
              </Link>
            )}
            {s.pendingVerificationsCount > 0 && (
              <Link
                to="/verifications"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-adopet-orange text-white font-medium hover:bg-adopet-orange-light"
              >
                Verificações ({s.pendingVerificationsCount})
              </Link>
            )}
            {s.pendingAdoptionsByTutorCount > 0 && (
              <Link
                to="/pending-adoptions-by-tutor"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-adopet-primary/90 text-white font-medium hover:bg-adopet-primary-dark"
              >
                Marcados pelo tutor ({s.pendingAdoptionsByTutorCount})
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-adopet-primary/10 bg-adopet-card p-6 text-center">
          <p className="text-adopet-text-secondary">Nada pendente para revisar no momento.</p>
        </div>
      )}
    </div>
  );
}
