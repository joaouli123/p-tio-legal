import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Car,
  Warehouse,
  FileText,
  Flame,
  FileCheck2,
  BarChart3,
  Users,
  Building2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/veiculos", label: "Veículos", icon: Car },
  { to: "/patio", label: "Pátio", icon: Warehouse },
  { to: "/processos", label: "Processos", icon: FileText },
  { to: "/destruicao", label: "Destruição", icon: Flame },
  { to: "/laudos", label: "Laudos", icon: FileCheck2 },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

const admin = [
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/unidades", label: "Unidades", icon: Building2 },
  { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <>
      <div className="p-5 border-b border-sidebar-border">
        <Logo size="md" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Operação
          </p>
          <ul className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-gradient-gold text-primary-foreground shadow-gold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-gold"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Administração
          </p>
          <ul className="space-y-1">
            {admin.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-gradient-gold text-primary-foreground shadow-gold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-gold"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-lg bg-gradient-card p-3 border border-gold-subtle">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <span className="text-xs font-semibold text-foreground">Sistema seguro</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Conformidade LGPD • Trilha de auditoria ativa
          </p>
        </div>
      </div>
    </>
  );
}
