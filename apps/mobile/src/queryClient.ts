import { QueryClient } from '@tanstack/react-query';

/** QueryClient compartilhado para permitir clear no logout (evita cache de usuário anterior). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
});
