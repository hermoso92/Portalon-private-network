import { Metadata } from 'next';
import { PartnerRegistrationForm } from '@/features/partners/PartnerRegistrationForm';

export const metadata: Metadata = {
  title: 'Solicitar acceso como partner',
};

export default function PartnerRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-portalon-stone p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            Únete a la red Portalon
          </h1>
          <p className="text-muted-foreground">
            Solicita acceso como partner y accede a promociones inmobiliarias premium
          </p>
        </div>
        <PartnerRegistrationForm />
      </div>
    </div>
  );
}
