import { Metadata } from 'next';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
