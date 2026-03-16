import { Metadata } from 'next';
import { PartnerDashboard } from '@/features/dashboard/PartnerDashboard';

export const metadata: Metadata = { title: 'Mi Dashboard' };

export default function PartnerDashboardPage() {
  return <PartnerDashboard />;
}
