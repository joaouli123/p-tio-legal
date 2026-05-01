import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, ShieldCheck, Eye, BarChart3, Wrench } from "lucide-react";

export const Route = createFileRoute("/usuarios")({
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "Usuários — Pátio Legal" }] }),
});

const users = [
  { name: "Master Admin", email: "master@patiolegal.app", role: "Administrador", roleColor: "gold", icon: ShieldCheck, last: "agora", initials: "MA" },
  { name: "João Silva", email: "joao.silva@maringa.pr.gov.br", role: "Operador", roleColor: "info", icon: Wrench, last: "há 4 min", initials: "JS" },
  { name: "Maria Costa", email: "maria.costa@maringa.pr.gov.br", role: "Analista", roleColor: "success", icon: BarChart3, last: "há 12 min", initials: "MC" },
  { name: "Pedro Almeida", email: "pedro.almeida@maringa.pr.gov.br", role: "Operador", roleColor: "info", icon: Wrench, last: "há 38 min", initials: "PA" },
  { name: "Lucas Mendes", email: "lucas.mendes@maringa.pr.gov.br", role: "Visualizador", roleColor: "muted", icon: Eye, last: "há 2 h", initials: "LM" },
];

function UsuariosPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Controle de acesso (RBAC)"
        title="Usuários e permissões"
        description="Perfis com níveis rigorosos: Operador, Supervisor, Autoridade Policial e Master Admin."
        actions={
          <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Administradores", v: 2, c: "gold" },
          { l: "Operadores", v: 18, c: "info" },
          { l: "Analistas", v: 7, c: "success" },
          { l: "Visualizadores", v: 12, c: "muted" },
        ].map((s) => (
          <div key={s.l} className={`rounded-xl bg-gradient-card border border-border p-5 shadow-elegant`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className={`text-3xl font-bold mt-1 text-${s.c === "muted" ? "foreground" : s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-lg">Equipe ativa</h3>
        </div>
        <div className="divide-y divide-border">
          {users.map((u) => {
            const Icon = u.icon;
            return (
              <div key={u.email} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                <Avatar className="h-11 w-11 border border-gold-subtle">
                  <AvatarFallback className="bg-gradient-gold text-primary-foreground font-semibold">
                    {u.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border bg-${u.roleColor}/15 border-${u.roleColor}/30 text-${u.roleColor === "muted" ? "muted-foreground" : u.roleColor} text-xs font-semibold`}>
                  <Icon className="h-3.5 w-3.5" />
                  {u.role}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{u.last}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
