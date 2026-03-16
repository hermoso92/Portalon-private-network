'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth-store';
import { getApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña requerida'),
  mode: z.enum(['admin', 'partner']),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const { login, loginAsPartner } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'admin' | 'partner'>('partner');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'partner' },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError('');
    try {
      if (mode === 'admin') {
        await login(data.email, data.password);
        router.push('/admin/dashboard');
      } else {
        await loginAsPartner(data.email, data.password);
        router.push('/partner/dashboard');
      }
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl border-0">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-center text-xl">Iniciar sesión</CardTitle>
        <div className="flex rounded-lg overflow-hidden border">
          <button
            type="button"
            onClick={() => setMode('partner')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'partner'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Soy partner
          </button>
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'admin'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Equipo interno
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder={mode === 'partner' ? 'partner@tuempresa.com' : 'admin@portalon.com'}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Acceder
              </>
            )}
          </Button>

          {mode === 'partner' && (
            <div className="text-center">
              <a
                href="/registro-partner"
                className="text-sm text-primary hover:underline"
              >
                ¿Aún no eres partner? Solicitar acceso
              </a>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
