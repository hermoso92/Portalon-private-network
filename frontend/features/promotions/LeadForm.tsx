'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, getApiError } from '@/lib/api';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(2, 'Nombre requerido'),
  lastName: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  country: z.string().optional(),
  budgetRange: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  promotionId: string;
  referralCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  onSuccess: () => void;
}

export function LeadForm({ promotionId, referralCode, utmSource, utmMedium, utmCampaign, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/leads/public', {
        ...data,
        promotionId,
        referralCode,
        utmSource,
        utmMedium,
        utmCampaign,
      });
      onSuccess();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre *</Label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="Tu nombre"
            className={errors.firstName ? 'border-destructive' : ''}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellidos</Label>
          <Input id="lastName" {...register('lastName')} placeholder="Tus apellidos" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="tu@email.com"
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" {...register('phone')} placeholder="+34 600 000 000" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">País de residencia</Label>
          <Input id="country" {...register('country')} placeholder="España" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetRange">Presupuesto aprox.</Label>
          <Input id="budgetRange" {...register('budgetRange')} placeholder="200.000 - 300.000€" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Mensaje (opcional)</Label>
        <textarea
          id="notes"
          {...register('notes')}
          placeholder="¿Qué tipo de apartamento te interesa? ¿Para qué fin?"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-portalon-gold hover:bg-portalon-gold/90 text-white py-5"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Solicitar información'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Tus datos están protegidos y no serán compartidos con terceros.
      </p>
    </form>
  );
}
