import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck, User, Edit3, Trash2, Plus, Eye } from "lucide-react";

export const Route = createFileRoute("/auditoria")({
  component: AuditoriaPage,
  head: () => ({ meta: [{ title: "Auditoria — Pátio Legal" }] }),
});

const logs = [
  { user: "master.admin", action: "Editou usuário 'joao.silva'", target: "Usuários", time: "20/05 14:32", icon: Edit3, color: "warning" },
  { user: "joao.silva", action: "Criou veículo ABC1D23", target: "Veículos", time: "20/05 14:18", icon: Plus, color: "success" },
  { user: "maria.costa", action: "Visualizou laudo LD-2026-0287", target: "Laudos", time: "20/05 14:05", icon: Eye, color: "info" },
  { user: "pedro.almeida", action: "Finalizou destruição ZXC7G89", target: "Destruição", time: "20/05 13:42", icon: ShieldCheck, color: "destructive" },
  { user: "master.admin", action: "Inativou laudo LD-2025-1872 (justificativa legal)", target: "Laudos", time: "20/05 11:15", icon: Trash2, color: "destructive" },
  { user: "lucas.mendes", action: "Login no sistema", target: "Acesso", time: "20/05 09:00", icon: User, color: "info" },
];

function AuditoriaPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Trilha de auditoria"
        title="Logs do sistema"
        description="Registro contínuo: Quem, Quando e O Que alterou. Imutável e exportável para órgãos de controle."
      />

      <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gold" />
          <h3 className="font-semibold">Atividades registradas</h3>
          <span className="ml-auto text-xs text-muted-foreground">Últimas 24h</span>
        </div>
        <ul className="divide-y divide-border">
          {logs.map((l, i) => {
            const Icon = l.icon;
            return (
              <li key={i} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-${l.color}/15 border border-${l.color}/30`}>
                  <Icon className={`h-4 w-4 text-${l.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-mono font-semibold text-gold">{l.user}</span>
                    <span className="text-muted-foreground"> — </span>
                    {l.action}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Módulo: {l.target}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{l.time}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </AppLayout>
  );
}
