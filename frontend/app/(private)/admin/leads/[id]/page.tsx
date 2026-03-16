import { Metadata } from 'next';
import { LeadDetail } from '@/features/leads/LeadDetail';

export const metadata: Metadata = { title: 'Detalle lead' };

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return <LeadDetail leadId={params.id} />;
}
