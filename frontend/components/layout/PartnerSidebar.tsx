'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Coins, FileText, LogOut, ChevronRight, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const navItems = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/leads', label: 'Mis leads', icon: Users },
  { href: '/partner/commissions', label: 'Mis comisiones', icon: Coins },
  { href: '/partner/materiales', label: 'Materiales', icon: FileText },
];

export function PartnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-portalon-dark flex flex-col h-full shrink-0">
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="font-serif text-lg font-bold text-white">Portalon</h1>
        <p className="text-portalon-gold text-xs mt-0.5">Área de Partner</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-portalon-gold/20 text-portalon-gold-light'
                  : 'text-white/60 hover:text-white hover:bg-white/5',
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-portalon-gold' : '')} />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-white/40 text-xs">Partner</p>
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
