'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserRole } from '@/lib/auth-store';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: Props) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard
      if (user.role === 'PARTNER') {
        router.push('/partner/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
