'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, getApiError } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  company: z.string().optional(),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  roleType: z.enum(['BROKER', 'ADVISOR', 'AGENCY', 'REFERRER', 'OTHER']),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
  notes: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const ROLE_OPTIONS = [
  { value: 'BROKER', label: 'Broker inmobiliario' },
  { value: 'ADVISOR', label: 'Asesor patrimonial' },
  { value: 'AGENCY', label: 'Agencia inmobiliaria' },
  { value: 'REFERRER', label: 'Referidor cualificado' },
  { value: 'OTHER', label: 'Otro' },
];

export function PartnerRegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleType: 'BROKER' },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError('');
    try {
      const { confirmPassword, ...payload } = data;
      await api.post('/partners/register', payload);
      setSuccess(true);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-xl mb-2">Solicitud enviada</h3>
          <p className="text-muted-foreground">
            Hemos recibido tu solicitud de acceso. El equipo de Portalon la revisará y te notificará por email cuando sea aprobada.
          </p>
          <Button className="mt-6" asChild>
            <a href="/login">Volver al inicio</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de registro</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input {...register('name')} placeholder="Tu nombre" className={errors.name ? 'border-destructive' : ''} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input {...register('company')} placeholder="Tu empresa" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" {...register('email')} placeholder="tu@email.com" className={errors.email ? 'border-destructive' : ''} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input {...register('phone')} placeholder="+34 600 000 000" />
            </div>
            <div className="space-y-2">
              <Label>Perfil *</Label>
              <Select defaultValue="BROKER" onValueChange={(v) => setValue('roleType', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Por qué quieres unirte a la red</Label>
            <textarea
              {...register('notes')}
              placeholder="Cuéntanos sobre tu perfil y por qué te interesa colaborar con Portalon..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input type="password" {...register('password')} placeholder="Mínimo 8 caracteres" className={errors.password ? 'border-destructive' : ''} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Confirmar contraseña *</Label>
              <Input type="password" {...register('confirmPassword')} placeholder="Repite la contraseña" className={errors.confirmPassword ? 'border-destructive' : ''} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Solicitar acceso'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ya tienes cuenta?{' '}
            <a href="/login" className="text-primary hover:underline">Iniciar sesión</a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
