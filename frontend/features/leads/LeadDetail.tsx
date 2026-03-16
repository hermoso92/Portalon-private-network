'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Brain, RefreshCw, User, MapPin, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import {
  formatDateTime,
  formatRelativeTime,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  getScoreColor,
  getScoreBadge,
  BUYER_TYPE_LABELS,
  COMMISSION_TRIGGER_LABELS,
} from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const STATUSES = [
  'NEW', 'QUALIFIED', 'CONTACTED', 'VISIT_SCHEDULED', 'VISITED', 'RESERVED', 'WON', 'LOST',
];

const ACTIVITY_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Cambio de estado',
  NOTE_ADDED: 'Nota añadida',
  VISIT_SCHEDULED: 'Visita programada',
  VISIT_COMPLETED: 'Visita realizada',
  CALL_LOGGED: 'Llamada registrada',
  EMAIL_SENT: 'Email enviado',
  RESERVATION_CREATED: 'Reserva creada',
  SALE_CLOSED: 'Venta cerrada',
  AI_SCORE_UPDATED: 'Score IA actualizado',
  ASSIGNED: 'Asignado',
};

interface Props {
  leadId: string;
}

export function LeadDetail({ leadId }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changingStatus, setChangingStatus] = useState(false);
  const [scoring, setScoring] = useState(false);

  const fetchLead = async () => {
    try {
      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data);
    } catch {
      router.push('/admin/leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLead(); }, [leadId]);

  const handleStatusChange = async (newStatus: string) => {
    setChangingStatus(true);
    try {
      await api.patch(`/leads/${leadId}/status`, { status: newStatus });
      await fetchLead();
      toast({ title: 'Estado actualizado', variant: 'default' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleRescore = async () => {
    setScoring(true);
    try {
      await api.post(`/leads/${leadId}/score`);
      await fetchLead();
      toast({ title: 'Score actualizado con IA' });
    } catch {
      toast({ title: 'Error al re-puntuar', variant: 'destructive' });
    } finally {
      setScoring(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (!lead) return null;

  const aiRiskData = lead.aiRiskFlags || {};
  const riskFlags = Array.isArray(aiRiskData.flags) ? aiRiskData.flags :
                    Array.isArray(aiRiskData) ? aiRiskData : [];
  const overallRisk: string | undefined = aiRiskData.overallRisk;
  const requiresManualReview: boolean = aiRiskData.requiresManualReview === true;
  const highRisks = riskFlags.filter((f: any) => f.severity === 'high');

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* Manual review alert */}
      {requiresManualReview && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-sm">Requiere revisión manual</p>
            <p className="text-xs text-red-700">Este lead tiene señales de riesgo que requieren validación antes de continuar.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lead.promotion?.name} · Creado {formatRelativeTime(lead.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lead.score !== null && (
            <div className={`text-center px-4 py-2 rounded-xl ${
              lead.score >= 70 ? 'bg-green-50' : lead.score >= 40 ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <p className={`text-3xl font-bold ${getScoreColor(lead.score)}`}>{lead.score}</p>
              <p className={`text-xs font-medium ${getScoreColor(lead.score)}`}>{getScoreBadge(lead.score)}</p>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleRescore} disabled={scoring}>
            <Brain className={`h-4 w-4 mr-2 ${scoring ? 'animate-pulse' : ''}`} />
            {scoring ? 'Puntuando...' : 'Re-puntuar IA'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Datos de contacto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {lead.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${lead.email}`} className="hover:text-foreground">{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${lead.phone}`} className="hover:text-foreground">{lead.phone}</a>
                  </div>
                )}
                {lead.country && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {lead.country}
                  </div>
                )}
                {lead.budgetRange && (
                  <div className="text-muted-foreground">
                    <span className="text-xs uppercase tracking-wide">Presupuesto: </span>
                    {lead.budgetRange}
                  </div>
                )}
                {lead.buyerType && lead.buyerType !== 'UNKNOWN' && (
                  <div className="text-muted-foreground">
                    <span className="text-xs uppercase tracking-wide">Tipo: </span>
                    {BUYER_TYPE_LABELS[lead.buyerType] || lead.buyerType}
                  </div>
                )}
                {lead.language && (
                  <div className="text-muted-foreground">
                    <span className="text-xs uppercase tracking-wide">Idioma: </span>
                    {lead.language}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {lead.aiSummary && (
            <Card className="border-l-4 border-l-portalon-gold">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-portalon-gold" />
                  Resumen IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{lead.aiSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* Risk flags */}
          {riskFlags.length > 0 && (
            <Card className={highRisks.length > 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-yellow-400'}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${highRisks.length > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
                    Flags de riesgo
                  </span>
                  {overallRisk && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      overallRisk === 'high' ? 'bg-red-100 text-red-700' :
                      overallRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      Riesgo {overallRisk === 'high' ? 'alto' : overallRisk === 'medium' ? 'medio' : 'bajo'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {riskFlags.map((flag: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded ${
                        flag.severity === 'high' ? 'bg-red-100 text-red-700' :
                        flag.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {flag.severity}
                      </span>
                      <span className="text-muted-foreground">{flag.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lead.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin actividad registrada</p>
                ) : (
                  lead.activities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {ACTIVITY_LABELS[activity.activityType] || activity.activityType}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                        {activity.user && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            por {activity.user.name}
                          </p>
                        )}
                        {activity.payload?.note && (
                          <p className="text-sm text-muted-foreground mt-1 bg-muted/50 rounded p-2">
                            {activity.payload.note}
                          </p>
                        )}
                        {activity.payload?.newStatus && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {LEAD_STATUS_LABELS[activity.payload.previousStatus]} → {' '}
                            <span className="font-medium">{LEAD_STATUS_LABELS[activity.payload.newStatus]}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Estado actual</p>
                <span className={`text-sm px-3 py-1.5 rounded-full ${LEAD_STATUS_COLORS[lead.status] || ''}`}>
                  {LEAD_STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Cambiar estado</p>
                <Select
                  value={lead.status}
                  onValueChange={handleStatusChange}
                  disabled={changingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Attribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atribución</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {lead.partner ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Partner</p>
                    <p className="font-medium">{lead.partner.name}</p>
                    {lead.partner.company && (
                      <p className="text-muted-foreground text-xs">{lead.partner.company}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Código referido</p>
                    <p className="font-mono text-sm">{lead.partner.referralCode}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Sin atribución a partner</p>
              )}

              {lead.attribution && (
                <>
                  {lead.attribution.utmSource && (
                    <div>
                      <p className="text-xs text-muted-foreground">UTM Source</p>
                      <p>{lead.attribution.utmSource}</p>
                    </div>
                  )}
                  {lead.attribution.utmCampaign && (
                    <div>
                      <p className="text-xs text-muted-foreground">Campaign</p>
                      <p>{lead.attribution.utmCampaign}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Commissions */}
          {lead.commissionEvents?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comisiones</CardTitle>
              </CardHeader>
              <CardContent>
                {lead.commissionEvents.map((ev: any) => (
                  <div key={ev.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{COMMISSION_TRIGGER_LABELS[ev.triggerType] || ev.triggerType}</span>
                    <div className="text-right">
                      <p className="font-medium">
                        {Number(ev.commissionAmount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{ev.status}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
