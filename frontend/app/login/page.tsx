import { Metadata } from 'next';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Acceso privado',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center portalon-gradient p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">
            Portalon Private Network
          </h1>
          <p className="text-white/60 text-sm">Acceso privado · Partners y equipo comercial</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
