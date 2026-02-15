import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/admin';
import { StatCard } from '@/components/StatCard';

const icons = {
  adopt: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  doc: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  alert: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  check: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        <StatCard title="Total de adoções" value={s.totalAdoptions} icon={icons.adopt} accent="primary" />
        <StatCard title="Adoções este mês" value={s.adoptionsThisMonth} icon={icons.adopt} accent="orange" />
        <StatCard title="Anúncios pendentes" value={s.pendingPetsCount} icon={icons.doc} accent="primary" />
        <StatCard title="Denúncias pendentes" value={s.pendingReportsCount} icon={icons.alert} accent="accent" />
        <StatCard title="Marcados pelo tutor" value={s.pendingAdoptionsByTutorCount} icon={icons.doc} accent="orange" />
        <StatCard title="Verificações pendentes" value={s.pendingVerificationsCount} icon={icons.check} accent="primary" />
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
