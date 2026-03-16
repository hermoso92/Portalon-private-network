'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Image, Video, LayoutGrid } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  brochure: <FileText className="h-8 w-8 text-blue-500" />,
  image: <Image className="h-8 w-8 text-green-500" />,
  video: <Video className="h-8 w-8 text-purple-500" />,
  floor_plan: <LayoutGrid className="h-8 w-8 text-orange-500" />,
};

export function MaterialesPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<string>('');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/promotions')
      .then((r) => {
        setPromotions(r.data);
        if (r.data.length > 0) {
          setSelectedPromo(r.data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPromo) return;
    api.get(`/promotions/${selectedPromo}/assets`)
      .then((r) => setAssets(r.data))
      .catch(() => setAssets([]));
  }, [selectedPromo]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Materiales</h1>
        <p className="text-muted-foreground text-sm mt-1">Dossiers, planos y materiales de promoción</p>
      </div>

      {promotions.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {promotions.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPromo(p.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedPromo === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay materiales disponibles para esta promoción.
            <br />
            <span className="text-sm">El equipo de Portalon publicará los materiales próximamente.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset: any) => (
            <Card key={asset.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {TYPE_ICONS[asset.type] || <FileText className="h-8 w-8 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{asset.title || 'Material'}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {asset.type}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => window.open(asset.fileUrl, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
