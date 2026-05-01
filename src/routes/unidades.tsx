import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Building2, MapPin, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unidades")({
  component: UnidadesPage,
  head: () => ({ meta: [{ title: "Unidades — Pátio Legal" }] }),
});

const unidades = [
  { nome: "18ª SDP Maringá", tipo: "Delegacia", endereco: "Av. Brasil, 4500 — Centro", tel: "(44) 3123-4567", processos: 412 },
  { nome: "1ª DP Maringá", tipo: "Delegacia", endereco: "R. Néo Alves Martins, 1234", tel: "(44) 3123-1100", processos: 298 },
  { nome: "2ª DP Maringá", tipo: "Delegacia", endereco: "Av. Tuiuti, 890", tel: "(44) 3123-2200", processos: 256 },
  { nome: "Vara Criminal de Maringá", tipo: "Fórum", endereco: "Av. Mauá, 765", tel: "(44) 3198-7000", processos: 95 },
  { nome: "DENARC Maringá", tipo: "Órgão Especial", endereco: "R. Pioneiro João Z., 200", tel: "(44) 3234-5500", processos: 187 },
];

function UnidadesPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Multi-tenant"
        title="Unidades e órgãos"
        description="Cadastro de delegacias, fóruns e órgãos de origem vinculados ao tenant Maringá - PR."
        actions={
          <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
            <Plus className="h-4 w-4" /> Nova unidade
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {unidades.map((u) => (
          <div key={u.nome} className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant hover:border-gold-subtle transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-11 w-11 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{u.tipo}</p>
                <h3 className="font-bold truncate">{u.nome}</h3>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {u.endereco}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {u.tel}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Processos vinculados</span>
              <span className="font-bold text-gold">{u.processos}</span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
