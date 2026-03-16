import { PartnerSidebar } from '@/components/layout/PartnerSidebar';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['PARTNER']}>
      <div className="flex h-screen bg-background overflow-hidden">
        <PartnerSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
