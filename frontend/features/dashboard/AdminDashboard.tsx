'use client';

import { useEffect, useState } from 'react';
import {
  Users, TrendingUp, Home, Euro, Calendar, Award, BarChart2, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import {
  formatCurrency, formatRelativeTime, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS,
} from '@/lib/utils';

const STATUS_CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#F59E0B', '#F97316', '#6366F1',
  '#10B981', '#059669', '#EF4444',
];

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Error al cargar el dashboard</p>
      </div>
    );
  }

  const { overview, leadsByStatus, unitsByStatus, topPartners, recentLeads } = data;

  const statusChartData = leadsByStatus.map((s: any) => ({
    name: LEAD_STATUS_LABELS[s.status] || s.status,
    value: s._count,
  }));

  const unitChartData = unitsByStatus.map((s: any) => ({
    name: s.status === 'AVAILABLE' ? 'Disponibles' : s.status === 'RESERVED' ? 'Reservadas' : 'Vendidas',
    value: s._count,
  }));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Red de distribución activa</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="Total leads"
          value={overview.totalLeads}
          bg="bg-blue-50"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
          label="Score medio"
          value={`${overview.avgScore}/100`}
          bg="bg-purple-50"
        />
        <KpiCard
          icon={<Calendar className="h-5 w-5 text-orange-500" />}
          label="Visitas"
          value={overview.visits}
          bg="bg-orange-50"
        />
        <KpiCard
          icon={<Award className="h-5 w-5 text-green-500" />}
          label="Ventas"
          value={overview.sales}
          bg="bg-green-50"
        />
        <KpiCard
          icon={<Home className="h-5 w-5 text-indigo-500" />}
          label="Reservas"
          value={overview.reservations}
          bg="bg-indigo-50"
        />
        <KpiCard
          icon={<Euro className="h-5 w-5 text-yellow-500" />}
          label="Comisión pendiente"
          value={formatCurrency(Number(overview.pendingCommissions))}
          bg="bg-yellow-50"
        />
        <KpiCard
          icon={<BarChart2 className="h-5 w-5 text-red-500" />}
          label="Comisiones generadas"
          value={overview.commissionEvents}
          bg="bg-red-50"
        />
        <KpiCard
          icon={<Activity className="h-5 w-5 text-teal-500" />}
          label="Partners activos"
          value={topPartners.length}
          bg="bg-teal-50"
        />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusChartData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unidades por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={unitChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top partners + recent leads */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPartners.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin partners todavía</p>
              ) : (
                topPartners.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.company}</p>
                    </div>
                    <Badge variant="secondary">{p._count.leads} leads</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(lead.createdAt)}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${LEAD_STATUS_COLORS[lead.status] || ''}`}
                  >
                    {LEAD_STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
