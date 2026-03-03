import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button, Card } from '@/components/ui';

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
        <Card className="shadow-lg rounded-2xl" padding="lg">
          <h1 className="text-xl font-display font-bold text-adopet-text-primary text-center mb-6">
              Painel Administrativo
            </h1>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-adopet-accent/10 text-adopet-accent text-sm border border-adopet-accent/20">
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
                className="w-full px-4 py-2.5 rounded-xl border border-adopet-primary/20 bg-adopet-card text-adopet-text-primary placeholder-adopet-text-secondary focus:outline-none focus:ring-2 focus:ring-adopet-primary/30 focus:border-adopet-primary/40"
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
                className="w-full px-4 py-2.5 rounded-xl border border-adopet-primary/20 bg-adopet-card text-adopet-text-primary placeholder-adopet-text-secondary focus:outline-none focus:ring-2 focus:ring-adopet-primary/30 focus:border-adopet-primary/40"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-adopet-accent">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
