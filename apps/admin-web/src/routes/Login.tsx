import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';

const schema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

type FormData = z.infer<typeof schema>;

export function Login() {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    clearError();
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      navigate('/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-adopet-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Adopet" className="h-12 w-auto" />
        </div>
        <div className="bg-adopet-card rounded-2xl border border-adopet-primary/10 shadow-lg p-8">
          <h1 className="text-xl font-display font-bold text-adopet-text-primary text-center mb-6">
            Painel Administrativo
          </h1>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-adopet-accent/10 text-adopet-accent text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-adopet-text-primary mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-adopet-primary/30 bg-white text-adopet-text-primary placeholder-adopet-text-secondary focus:outline-none focus:ring-2 focus:ring-adopet-primary focus:border-transparent"
                placeholder="admin@exemplo.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-adopet-accent">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-adopet-text-primary mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-adopet-primary/30 bg-white text-adopet-text-primary placeholder-adopet-text-secondary focus:outline-none focus:ring-2 focus:ring-adopet-primary focus:border-transparent"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-adopet-accent">{errors.password.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-adopet-primary text-white font-semibold hover:bg-adopet-primary-dark focus:outline-none focus:ring-2 focus:ring-adopet-primary focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
