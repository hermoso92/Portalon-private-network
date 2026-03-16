'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Euro, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatCurrency, formatRelativeTime, COMMISSION_STATUS_LABELS } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DISPUTED: 'bg-red-100 text-red-800',
};

const TRIGGER_LABELS: Record<string, string> = {
  ON_VISIT: 'Visita',
  ON_RESERVATION: 'Reserva',
  ON_SALE: 'Venta',
  ON_LEAD: 'Lead',
};

export function CommissionsPage() {
  const { user } = useAuthStore();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ pending: 0, approved: 0, paid: 0 });

  const fetchCommissions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const res = await api.get(`/commissions?${params}`);
      setCommissions(res.data.data);
      setPagination(res.data.pagination);

      // Calculate totals
      const { data } = res.data;
      const pending = data.filter((c: any) => c.status === 'PENDING').reduce((a: number, c: any) => a + Number(c.commissionAmount), 0);
      const approved = data.filter((c: any) => c.status === 'APPROVED').reduce((a: number, c: any) => a + Number(c.commissionAmount), 0);
      const paid = data.filter((c: any) => c.status === 'PAID').reduce((a: number, c: any) => a + Number(c.commissionAmount), 0);
      setTotals({ pending, approved, paid });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommissions(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/commissions/${id}/status`, { status });
      await fetchCommissions();
      toast({ title: `Comisión ${COMMISSION_STATUS_LABELS[status].toLowerCase()}` });
    } catch {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const isAdmin = user?.role !== 'PARTNER';

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isAdmin ? 'Comisiones' : 'Mis comisiones'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{pagination.total} eventos de comisión</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchCommissions()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(totals.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Aprobada</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.approved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pagada</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.paid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))
        ) : commissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay comisiones registradas
            </CardContent>
          </Card>
        ) : (
          commissions.map((commission) => (
            <Card key={commission.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[commission.status] || ''}`}>
                        {COMMISSION_STATUS_LABELS[commission.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {TRIGGER_LABELS[commission.triggerType] || commission.triggerType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(commission.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Lead: </span>
                        <span>{commission.lead?.firstName} {commission.lead?.lastName}</span>
                      </div>
                      {isAdmin && commission.partner && (
                        <div>
                          <span className="text-muted-foreground">Partner: </span>
                          <span>{commission.partner.name}</span>
                        </div>
                      )}
                      {commission.promotion && (
                        <div>
                          <span className="text-muted-foreground">Promoción: </span>
                          <span>{commission.promotion.name}</span>
                        </div>
                      )}
                    </div>
                    {commission.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{commission.notes}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">
                      {formatCurrency(Number(commission.commissionAmount))}
                    </p>
                    {commission.baseAmount && (
                      <p className="text-xs text-muted-foreground">
                        sobre {formatCurrency(Number(commission.baseAmount))}
                      </p>
                    )}

                    {isAdmin && commission.status === 'PENDING' && (
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateStatus(commission.id, 'APPROVED')}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus(commission.id, 'CANCELLED')}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    )}

                    {isAdmin && commission.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => updateStatus(commission.id, 'PAID')}
                      >
                        <Euro className="h-3 w-3 mr-1" />
                        Marcar pagada
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
