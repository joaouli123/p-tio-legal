import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Warehouse, MapPin, Plus } from "lucide-react";

export const Route = createFileRoute("/patio")({
  component: PatioPage,
  head: () => ({ meta: [{ title: "Pátio — Pátio Legal" }] }),
});

const setores = [
  { id: "A", nome: "Setor A — Automóveis", capacidade: 500, ocupados: 412, cor: "info" },
  { id: "B", nome: "Setor B — Motos", capacidade: 400, ocupados: 298, cor: "gold" },
  { id: "C", nome: "Setor C — Caminhões", capacidade: 400, ocupados: 356, cor: "destructive" },
  { id: "D", nome: "Setor D — Peças/Outros", capacidade: 300, ocupados: 182, cor: "success" },
  { id: "E", nome: "Pátio externo", capacidade: 400, ocupados: 0, cor: "muted" },
];

function PatioPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Controle de pátio"
        title="Gestão de localização"
        description="Visualização da ocupação por setor, capacidade total e movimentações."
        actions={
          <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
            <Plus className="h-4 w-4" /> Movimentação
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {setores.map((s) => {
          const pct = Math.round((s.ocupados / s.capacidade) * 100);
          return (
            <div key={s.id} className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant hover:border-gold-subtle transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-${s.cor}/15 text-${s.cor} border border-${s.cor}/30`}>
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.id}</p>
                  <h3 className="font-semibold text-sm">{s.nome}</h3>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Ocupação</span>
                  <span className="font-semibold">{s.ocupados} / {s.capacidade}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-gold transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{pct}% utilizado</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gold" /> Mapa do pátio
        </h3>
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 80 }).map((_, i) => {
            const occupied = Math.random() > 0.3;
            return (
              <div
                key={i}
                className={`aspect-square rounded ${
                  occupied ? "bg-gold/40 hover:bg-gold/70 cursor-pointer" : "bg-muted/40"
                } transition-colors flex items-center justify-center text-[9px] font-mono text-foreground/50`}
                title={occupied ? `Vaga ${i + 1} ocupada` : `Vaga ${i + 1} livre`}
              >
                {occupied ? "•" : ""}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-gold/40" /> Ocupada</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-muted/40" /> Livre</span>
        </div>
      </div>
    </AppLayout>
  );
}
