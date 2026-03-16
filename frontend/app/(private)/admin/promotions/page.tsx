import { Metadata } from 'next';
import { PromotionsAdmin } from '@/features/promotions/PromotionsAdmin';

export const metadata: Metadata = { title: 'Promociones' };

export default function PromotionsAdminPage() {
  return <PromotionsAdmin />;
}
