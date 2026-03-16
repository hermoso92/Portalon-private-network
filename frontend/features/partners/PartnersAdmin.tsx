'use client';

import { useEffect, useState } from 'react';
import { Check, X, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatRelativeTime, PARTNER_STATUS_LABELS } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-gray-100 text-gray-800',
};

const ROLE_LABELS: Record<string, string> = {
  BROKER: 'Broker',
  ADVISOR: 'Asesor',
  AGENCY: 'Agencia',
  REFERRER: 'Referidor',
  OTHER: 'Otro',
};

export function PartnersAdmin() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await api.get(`/partners${params}`);
      setPartners(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPartners(); }, [filterStatus]);

  const updateStatus = async (partnerId: string, status: string) => {
    try {
      await api.patch(`/partners/${partnerId}/status`, { status });
      await fetchPartners();
      toast({ title: `Partner ${PARTNER_STATUS_LABELS[status].toLowerCase()}` });
    } catch {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const copyReferralLink = (code: string) => {
    const slug = process.env.NEXT_PUBLIC_PROMOTION_SLUG || 'el-portalon-del-brillante';
    const link = `${window.location.origin}/promocion/${slug}?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Enlace copiado' });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partners</h1>
          <p className="text-muted-foreground text-sm mt-1">{partners.length} partners registrados</p>
        </div>

        <div className="flex gap-3">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(PARTNER_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchPartners}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))
        ) : partners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay partners {filterStatus ? `con estado ${PARTNER_STATUS_LABELS[filterStatus]}` : ''}
            </CardContent>
          </Card>
        ) : (
          partners.map((partner) => (
            <Card key={partner.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium">{partner.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[partner.status] || ''}`}>
                        {PARTNER_STATUS_LABELS[partner.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_LABELS[partner.roleType] || partner.roleType}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {partner.company && <span>{partner.company}</span>}
                      <span>{partner.email}</span>
                      {partner.phone && <span>{partner.phone}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          {partner.referralCode}
                        </span>
                        <button
                          onClick={() => copyReferralLink(partner.referralCode)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {partner._count?.leads || 0} leads · {formatRelativeTime(partner.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {partner.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateStatus(partner.id, 'APPROVED')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus(partner.id, 'REJECTED')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </>
                    )}

                    {partner.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(partner.id, 'SUSPENDED')}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Suspender
                      </Button>
                    )}

                    {(partner.status === 'REJECTED' || partner.status === 'SUSPENDED') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(partner.id, 'APPROVED')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Reactivar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
