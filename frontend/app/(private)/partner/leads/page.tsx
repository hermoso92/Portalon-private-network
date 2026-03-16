import { Metadata } from 'next';
import { LeadsCRM } from '@/features/leads/LeadsCRM';

export const metadata: Metadata = { title: 'Mis Leads' };

export default function PartnerLeadsPage() {
  return <LeadsCRM />;
}
