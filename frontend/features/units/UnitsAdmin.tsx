'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatCurrency, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/lib/utils';

export function UnitsAdmin() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<string>('');
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/promotions').then((r) => {
      setPromotions(r.data);
      if (r.data.length > 0) setSelectedPromo(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedPromo) return;
    setLoading(true);
    api.get(`/promotions/${selectedPromo}/units`)
      .then((r) => setUnits(r.data))
      .finally(() => setLoading(false));
  }, [selectedPromo]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Unidades</h1>
          <p className="text-muted-foreground text-sm mt-1">{units.length} unidades</p>
        </div>

        {promotions.length > 1 && (
          <Select value={selectedPromo} onValueChange={setSelectedPromo}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Seleccionar promoción" />
            </SelectTrigger>
            <SelectContent>
              {promotions.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit: any) => (
            <Card key={unit.id} className={unit.featured ? 'ring-2 ring-portalon-gold' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{unit.unitCode}</h3>
                    {unit.title && <p className="text-xs text-muted-foreground">{unit.title}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${UNIT_STATUS_COLORS[unit.status] || ''}`}>
                    {UNIT_STATUS_LABELS[unit.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground mb-3">
                  {unit.bedrooms !== null && <span>{unit.bedrooms} dorm.</span>}
                  {unit.bathrooms !== null && <span>{unit.bathrooms} baños</span>}
                  {unit.interiorM2 && <span>{Number(unit.interiorM2)} m²</span>}
                  {unit.exteriorM2 && <span>{Number(unit.exteriorM2)} m² ext.</span>}
                  {unit.parkingIncluded && <span>Parking ✓</span>}
                  {unit.jacuzzi && <span>Jacuzzi ✓</span>}
                </div>

                {unit.price && (
                  <p className="font-bold text-lg">
                    {formatCurrency(Number(unit.price))}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
