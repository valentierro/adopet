import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { Layout } from '@/components/Layout';
import { Login } from '@/routes/Login';
import { Dashboard } from '@/routes/Dashboard';
import { PendingPets } from '@/routes/PendingPets';
import { Verifications } from '@/routes/Verifications';
import { Reports } from '@/routes/Reports';
import { Adoptions } from '@/routes/Adoptions';
import { PendingAdoptionsByTutor } from '@/routes/PendingAdoptionsByTutor';
import { Partners } from '@/routes/Partners';
import { PartnerRecommendations } from '@/routes/PartnerRecommendations';
import { BugReports } from '@/routes/BugReports';
import { FeatureFlags } from '@/routes/FeatureFlags';
import { Users } from '@/routes/Users';
import { About } from '@/routes/About';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-adopet-background">
        <div className="text-adopet-text-secondary">Carregando…</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pending-pets" element={<PendingPets />} />
        <Route path="verifications" element={<Verifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="adoptions" element={<Adoptions />} />
        <Route path="pending-adoptions-by-tutor" element={<PendingAdoptionsByTutor />} />
        <Route path="partners" element={<Partners />} />
        <Route path="partner-recommendations" element={<PartnerRecommendations />} />
        <Route path="bug-reports" element={<BugReports />} />
        <Route path="feature-flags" element={<FeatureFlags />} />
        <Route path="users" element={<Users />} />
        <Route path="about" element={<About />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
