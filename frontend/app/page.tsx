import { redirect } from 'next/navigation';

export default function RootPage() {
  const slug = process.env.NEXT_PUBLIC_PROMOTION_SLUG || 'el-portalon-del-brillante';
  redirect(`/promocion/${slug}`);
}
