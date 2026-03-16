import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingPage } from '@/features/promotions/LandingPage';

async function getPromotion(slug: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${API_URL}/promotions/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const promotion = await getPromotion(params.slug);
  if (!promotion) return { title: 'Promoción no encontrada' };

  return {
    title: promotion.name,
    description: promotion.shortDescription,
    openGraph: {
      title: promotion.name,
      description: promotion.shortDescription,
      images: promotion.heroImageUrl ? [promotion.heroImageUrl] : [],
    },
  };
}

export default async function PromotionLandingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { ref?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string };
}) {
  const promotion = await getPromotion(params.slug);

  if (!promotion || promotion.publicStatus === 'DRAFT') {
    notFound();
  }

  return (
    <LandingPage
      promotion={promotion}
      referralCode={searchParams.ref}
      utmSource={searchParams.utm_source}
      utmMedium={searchParams.utm_medium}
      utmCampaign={searchParams.utm_campaign}
    />
  );
}
