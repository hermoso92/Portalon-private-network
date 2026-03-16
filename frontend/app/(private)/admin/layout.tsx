import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['SUPER_ADMIN', 'PROMOTION_MANAGER', 'SALES_AGENT']}>
      <div className="flex h-screen bg-background overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
