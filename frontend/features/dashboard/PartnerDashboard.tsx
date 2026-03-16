'use client';

import { useEffect, useState } from 'react';
import { Users, TrendingUp, Award, Euro, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatCurrency, formatRelativeTime, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export function PartnerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/partner'),
      api.get('/partners/me'),
    ])
      .then(([dashRes, meRes]) => {
        setData(dashRes.data);
        setPartnerInfo(meRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyReferralLink = () => {
    if (!partnerInfo?.referralCode) return;
    const slug = process.env.NEXT_PUBLIC_PROMOTION_SLUG || 'el-portalon-del-brillante';
    const link = `${window.location.origin}/promocion/${slug}?ref=${partnerInfo.referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Enlace de referido copiado' });
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { overview, leadsByStatus, recentLeads, promotions } = data;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Bienvenido, {user?.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Tu panel de actividad comercial</p>
      </div>

      {/* Referral link */}
      {partnerInfo?.referralCode && (
        <Card className="bg-portalon-dark text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white/60 text-xs mb-1">Tu enlace de referido</p>
                <p className="font-mono text-sm text-portalon-gold-light">
                  Código: <strong>{partnerInfo.referralCode}</strong>
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="bg-portalon-gold hover:bg-portalon-gold/90 text-white"
                  onClick={copyReferralLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar enlace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    const slug = process.env.NEXT_PUBLIC_PROMOTION_SLUG || 'el-portalon-del-brillante';
                    window.open(`/promocion/${slug}?ref=${partnerInfo.referralCode}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={<Users className="h-5 w-5 text-blue-500" />} label="Total leads" value={overview.totalLeads} bg="bg-blue-50" />
        <KpiCard icon={<TrendingUp className="h-5 w-5 text-purple-500" />} label="Leads activos" value={overview.activeLeads} bg="bg-purple-50" />
        <KpiCard icon={<Award className="h-5 w-5 text-orange-500" />} label="Visitas" value={overview.visits} bg="bg-orange-50" />
        <KpiCard icon={<Award className="h-5 w-5 text-indigo-500" />} label="Reservas" value={overview.reservations} bg="bg-indigo-50" />
        <KpiCard icon={<Award className="h-5 w-5 text-green-500" />} label="Ventas" value={overview.sales} bg="bg-green-50" />
        <KpiCard
          icon={<Euro className="h-5 w-5 text-yellow-500" />}
          label="Comisión pendiente"
          value={formatCurrency(Number(overview.pendingCommissions))}
          bg="bg-yellow-50"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mis últimos leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no tienes leads registrados</p>
              ) : (
                recentLeads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(lead.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LEAD_STATUS_COLORS[lead.status] || ''}`}>
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available promotions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promociones disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {promotions.map((promo: any) => (
                <div key={promo.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{promo.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {promo.unitsAvailable} unidades disponibles
                      </p>
                      {promo.priceMin && (
                        <p className="text-sm font-semibold text-portalon-gold mt-1">
                          Desde {formatCurrency(Number(promo.priceMin))}
                        </p>
                      )}
                    </div>
                    <Badge variant="success">Publicada</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
