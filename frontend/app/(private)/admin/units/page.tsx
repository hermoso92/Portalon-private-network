import { Metadata } from 'next';
import { UnitsAdmin } from '@/features/units/UnitsAdmin';

export const metadata: Metadata = { title: 'Unidades' };

export default function UnitsAdminPage() {
  return <UnitsAdmin />;
}
