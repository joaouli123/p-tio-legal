import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Calendar, Building2, ChevronRight, Loader2, Eye } from "lucide-react";
import { getVeiculos, type Veiculo } from "@/lib/db";

export const Route = createFileRoute("/processos")({
  component: ProcessosPage,
  head: () => ({ meta: [{ title: "Processos — Pátio Legal" }] }),
});

function ProcessosPage() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Veiculo | null>(null);

  const NO_PROCESS_KEY = "Sem processo";

  const openProcessVehicles = (processo: string, vinculados: Veiculo[]) => {
    if (vinculados.length === 1) {
      void navigate({ to: "/veiculos/$id", params: { id: vinculados[0].id } });
      return;
    }

    // The "Sem processo" bucket has no processo number to search by — a textual
    // search for "Sem processo" would return nothing. Just preview the first
    // vehicle instead of navigating to an empty search result.
    if (processo === NO_PROCESS_KEY) {
      if (vinculados.length > 0) setSelected(vinculados[0]);
      return;
    }

    void navigate({
      to: "/veiculos",
      search: { q: processo } as never,
    });
  };

  useEffect(() => {
    getVeiculos()
      .then(data => {
        setVeiculos(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group by processo number
  const byProcesso = veiculos.reduce<Record<string, Veiculo[]>>((acc, v) => {
    const key = v.processo ?? "Sem processo";
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const processos = Object.entries(byProcesso).filter(([num]) =>
    !query || num.toLowerCase().includes(query.toLowerCase()) ||
    byProcesso[num].some(v => v.delegacia_nome?.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        eyebrow="Acompanhamento processual"
        title="Processos vinculados"
        description="Cada bem apreendido vinculado a número de processo e órgão de origem, com histórico imutável."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número de processo ou delegacia…"
              className="pl-10 bg-muted/40"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando processos…</span>
            </div>
          ) : processos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="font-medium">Nenhum processo encontrado</p>
            </div>
          ) : (
            processos.map(([num, vs]) => (
              <div
                key={num}
                onClick={() => openProcessVehicles(num, vs)}
                className={`rounded-xl bg-gradient-card border p-5 shadow-elegant hover:border-gold-subtle transition-all group cursor-pointer ${selected && vs.some(v => v.id === selected.id) ? "border-gold/50" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-gold shrink-0" />
                      <span className="font-mono font-bold text-sm text-gold truncate">{num}</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {vs[0].delegacia_nome ?? "—"}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(vs[0].created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-semibold">{vs.length}</span>
                        <span className="text-muted-foreground text-xs">veículo(s) vinculado(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <StatusBadge status={vs[0].status as any} />
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-gold transition-colors" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant h-fit">
          <h3 className="font-semibold text-lg mb-1">Detalhes do processo</h3>
          <p className="text-xs text-muted-foreground mb-4">O clique no cartão abre a listagem dos veículos vinculados a este processo.</p>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/20 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Placa</p>
                <p className="font-mono font-bold text-gold text-lg">{selected.placa}</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Modelo</p>
                <p className="font-semibold">{selected.marca_modelo}</p>
              </div>
              {selected.ano && (
                <div className="rounded-lg bg-muted/20 p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Ano</p>
                  <p>{selected.ano}</p>
                </div>
              )}
              <div className="rounded-lg bg-muted/20 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Delegacia</p>
                <p>{selected.delegacia_nome ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <StatusBadge status={selected.status as any} />
              </div>
              {selected.local_vaga && (
                <div className="rounded-lg bg-muted/20 p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Vaga</p>
                  <p className="font-mono">{selected.local_vaga}</p>
                </div>
              )}
              <div className="rounded-lg bg-muted/20 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Entrada</p>
                <p>{new Date(selected.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" className="gap-2 border-border" onClick={() => void navigate({ to: "/veiculos/$id", params: { id: selected.id } })}>
                  <Eye className="h-4 w-4" /> Abrir cadastro
                </Button>
                {selected.processo && (
                  <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold" onClick={() => openProcessVehicles(selected.processo, byProcesso[selected.processo] ?? [selected])}>
                    <FileText className="h-4 w-4" /> Ver todos do processo
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um processo para ver detalhes</p>
          )}
        </div>
      </div>
    </>
  );
}

