'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import {
  formatRelativeTime,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  getScoreColor,
  getScoreBadge,
} from '@/lib/utils';

const STATUSES = [
  'NEW', 'QUALIFIED', 'CONTACTED', 'VISIT_SCHEDULED', 'VISITED', 'RESERVED', 'WON', 'LOST',
];

const SOURCE_LABELS: Record<string, string> = {
  LANDING_PUBLIC: 'Landing pública',
  PARTNER_REFERRAL: 'Referido partner',
  PARTNER_MANUAL: 'Partner manual',
  DIRECT: 'Directo',
  ORGANIC: 'Orgánico',
  PAID: 'Pagado',
  OTHER: 'Otro',
};

export function LeadsCRM() {
  const router = useRouter();
  const pathname = usePathname();
  // Derive the correct lead detail base path based on the current route context.
  // Partner routes live under /partner/*, admin routes under /admin/*.
  const isPartnerContext = pathname?.startsWith('/partner');
  const leadDetailBasePath = isPartnerContext ? '/partner/leads' : '/admin/leads';
  const [leads, setLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sourceType: '',
    page: 1,
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.sourceType) params.set('sourceType', filters.sourceType);
      params.set('page', String(filters.page));
      params.set('limit', '20');

      const res = await api.get(`/leads?${params}`);
      setLeads(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Contacto',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.email || row.original.phone || '—'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => (
        <span className={`text-xs px-2 py-1 rounded-full ${LEAD_STATUS_COLORS[row.original.status] || ''}`}>
          {LEAD_STATUS_LABELS[row.original.status] || row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => (
        <div>
          <span className={`font-semibold ${getScoreColor(row.original.score)}`}>
            {row.original.score ?? '—'}
          </span>
          {row.original.score && (
            <p className="text-xs text-muted-foreground">{getScoreBadge(row.original.score)}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'sourceType',
      header: 'Origen',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {SOURCE_LABELS[row.original.sourceType] || row.original.sourceType}
        </span>
      ),
    },
    {
      accessorKey: 'partner',
      header: 'Partner',
      cell: ({ row }) => row.original.partner?.name || <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      accessorKey: 'promotion',
      header: 'Promoción',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.promotion?.name}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatRelativeTime(row.original.createdAt)}</span>
      ),
    },
  ];

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CRM · Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{pagination.total} leads en total</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sourceType}
              onValueChange={(v) => setFilters((f) => ({ ...f, sourceType: v === 'all' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los orígenes</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/30">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Cargando leads...
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    No se encontraron leads con los filtros actuales
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`${leadDetailBasePath}/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
