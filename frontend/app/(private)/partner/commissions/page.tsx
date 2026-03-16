import { Metadata } from 'next';
import { CommissionsPage } from '@/features/commissions/CommissionsPage';

export const metadata: Metadata = { title: 'Mis Comisiones' };

export default function PartnerCommissionsPage() {
  return <CommissionsPage />;
}
