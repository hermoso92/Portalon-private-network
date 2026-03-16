import { Metadata } from 'next';
import { PartnersAdmin } from '@/features/partners/PartnersAdmin';

export const metadata: Metadata = { title: 'Partners' };

export default function PartnersPage() {
  return <PartnersAdmin />;
}
