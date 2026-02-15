import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/pending-pets', label: 'Anúncios pendentes' },
  { to: '/verifications', label: 'Verificações' },
  { to: '/reports', label: 'Denúncias' },
  { to: '/adoptions', label: 'Adoções' },
  { to: '/pending-adoptions-by-tutor', label: 'Marcados pelo tutor' },
  { to: '/partners', label: 'Parceiros' },
  { to: '/partner-recommendations', label: 'Indicações de parceiros' },
  { to: '/bug-reports', label: 'Bug reports' },
  { to: '/users', label: 'Usuários' },
  { to: '/about', label: 'Sobre' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-adopet-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-adopet-surface border-r border-adopet-primary/20 transform transition-transform md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-adopet-primary/20 bg-adopet-header">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Adopet" className="h-8 w-auto" />
              <span className="font-display font-semibold text-adopet-text-primary">Admin</span>
            </Link>
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-adopet-primary/10"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-2">
            <ul className="space-y-0.5">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-adopet-primary text-white'
                          : 'text-adopet-text-secondary hover:bg-adopet-primary/10 hover:text-adopet-text-primary'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 bg-adopet-card border-b border-adopet-primary/20 shrink-0">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-adopet-primary/10"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 md:flex-none" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-adopet-text-secondary truncate max-w-[180px]" title={user?.email}>
              {user?.name ?? user?.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-adopet-primary hover:text-adopet-primary-dark"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
