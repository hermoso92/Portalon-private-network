import { Metadata } from 'next';
import { CommissionsPage } from '@/features/commissions/CommissionsPage';

export const metadata: Metadata = { title: 'Comisiones' };

export default function AdminCommissionsPage() {
  return <CommissionsPage />;
}
