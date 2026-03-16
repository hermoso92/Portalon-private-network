import { Metadata } from 'next';
import { LeadsCRM } from '@/features/leads/LeadsCRM';

export const metadata: Metadata = { title: 'CRM · Leads' };

export default function LeadsPage() {
  return <LeadsCRM />;
}
