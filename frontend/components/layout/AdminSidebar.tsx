'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Home,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'CRM / Leads', icon: Users },
  { href: '/admin/promotions', label: 'Promociones', icon: Building2 },
  { href: '/admin/units', label: 'Unidades', icon: Home },
  { href: '/admin/partners', label: 'Partners', icon: UserCheck },
  { href: '/admin/commissions', label: 'Comisiones', icon: Coins },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-portalon-dark flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/admin/dashboard">
          <h1 className="font-serif text-lg font-bold text-white leading-tight">
            Portalon
          </h1>
          <p className="text-white/40 text-xs mt-0.5">Private Network</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-portalon-gold/20 text-portalon-gold-light'
                  : 'text-white/60 hover:text-white hover:bg-white/5',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-portalon-gold' : '')} />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-portalon-gold/20 flex items-center justify-center">
            <span className="text-portalon-gold text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-white/40 text-xs truncate">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-white/50 hover:text-white hover:bg-white/5 justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
