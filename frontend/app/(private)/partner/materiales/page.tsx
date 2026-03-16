import { Metadata } from 'next';
import { MaterialesPage } from '@/features/promotions/MaterialesPage';

export const metadata: Metadata = { title: 'Materiales' };

export default function PartnerMaterialesPage() {
  return <MaterialesPage />;
}
