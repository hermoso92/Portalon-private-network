'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, TrendingUp, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', PUBLISHED: 'Publicada', SOLD_OUT: 'Agotada', PAUSED: 'Pausada', CLOSED: 'Cerrada',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800', PUBLISHED: 'bg-green-100 text-green-800',
  SOLD_OUT: 'bg-red-100 text-red-800', PAUSED: 'bg-yellow-100 text-yellow-800', CLOSED: 'bg-gray-100 text-gray-600',
};

export function PromotionsAdmin() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/promotions')
      .then((r) => setPromotions(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Promociones</h1>
          <p className="text-muted-foreground text-sm mt-1">{promotions.length} promociones</p>
        </div>
      </div>

      {loading ? (
        [...Array(2)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)
      ) : (
        <div className="grid gap-4">
          {promotions.map((promo) => (
            <Card key={promo.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{promo.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[promo.publicStatus] || ''}`}>
                        {STATUS_LABELS[promo.publicStatus]}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{promo.shortDescription}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Home className="h-4 w-4" />
                        {promo.unitsAvailable} disponibles / {promo.totalUnits} total
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        {promo._count?.leads || 0} leads
                      </div>
                      {promo.priceMin && (
                        <span className="font-medium text-foreground">
                          Desde {formatCurrency(Number(promo.priceMin), promo.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/promocion/${promo.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver landing
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
