import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  QUALIFIED: 'Cualificado',
  CONTACTED: 'Contactado',
  VISIT_SCHEDULED: 'Visita programada',
  VISITED: 'Visitado',
  RESERVED: 'Reservado',
  WON: 'Vendido',
  LOST: 'Perdido',
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-purple-100 text-purple-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  VISIT_SCHEDULED: 'bg-orange-100 text-orange-800',
  VISITED: 'bg-indigo-100 text-indigo-800',
  RESERVED: 'bg-green-100 text-green-800',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-red-100 text-red-800',
};

export const UNIT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  UNAVAILABLE: 'No disponible',
};

export const UNIT_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  RESERVED: 'bg-yellow-100 text-yellow-800',
  SOLD: 'bg-gray-100 text-gray-800',
  UNAVAILABLE: 'bg-red-100 text-red-800',
};

export const PARTNER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SUSPENDED: 'Suspendido',
};

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En disputa',
};

export const BUYER_TYPE_LABELS: Record<string, string> = {
  UNKNOWN: 'No especificado',
  INVESTOR: 'Inversor',
  END_USER: 'Comprador final',
  DEVELOPER: 'Promotor',
  CORPORATE: 'Empresa',
};

export const COMMISSION_TRIGGER_LABELS: Record<string, string> = {
  ON_LEAD: 'Por lead',
  ON_VISIT: 'Por visita',
  ON_RESERVATION: 'Comisión de reserva',
  ON_SALE: 'Comisión de venta',
};

export function getScoreColor(score: number | null): string {
  if (!score) return 'text-gray-400';
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-500';
}

export function getScoreBadge(score: number | null): string {
  if (!score) return 'Sin score';
  if (score >= 70) return 'Caliente';
  if (score >= 40) return 'Templado';
  return 'Frío';
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    PROMOTION_MANAGER: 'Gestor de Promoción',
    SALES_AGENT: 'Agente Comercial',
    PARTNER: 'Partner',
    VIEWER: 'Visualizador',
  };
  return labels[role] || role;
}
