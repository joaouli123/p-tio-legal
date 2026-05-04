import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Calendar, Building2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/processos")({
  component: ProcessosPage,
  head: () => ({ meta: [{ title: "Processos — Pátio Legal" }] }),
});

const processos = [
  { num: "0001234-56.2024.8.16.0190", orgao: "Vara Criminal de Maringá", delegacia: "18ª SDP Maringá", veiculos: 3, abertura: "10/05/2024", status: "em-analise" as const },
  { num: "0002345-67.2024.8.16.0190", orgao: "Vara Criminal de Maringá", delegacia: "1ª DP Maringá", veiculos: 1, abertura: "12/05/2024", status: "no-patio" as const },
  { num: "0003456-78.2024.8.16.0190", orgao: "DENARC", delegacia: "2ª DP Maringá", veiculos: 5, abertura: "08/05/2024", status: "destruido" as const },
  { num: "0004567-89.2024.8.16.0190", orgao: "Vara Criminal de Maringá", delegacia: "18ª SDP Maringá", veiculos: 2, abertura: "15/05/2024", status: "leilao" as const },
];

function ProcessosPage() {
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
            <Input placeholder="Buscar por número de processo…" className="pl-10 bg-muted/40" />
          </div>

          {processos.map((p) => (
            <div key={p.num} className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant hover:border-gold-subtle transition-all group cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gold shrink-0" />
                    <span className="font-mono font-bold text-sm text-gold truncate">{p.num}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {p.orgao}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {p.delegacia}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Aberto em {p.abertura}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-semibold">{p.veiculos}</span>
                      <span className="text-muted-foreground text-xs">veículo(s) vinculado(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <StatusBadge status={p.status} />
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant h-fit">
          <h3 className="font-semibold text-lg mb-1">Linha do tempo</h3>
          <p className="text-xs text-muted-foreground mb-4">Histórico imutável • Processo destacado</p>
          <ol className="relative border-l border-gold/30 ml-2 space-y-5">
            {[
              { d: "10/05/2024 09:30", t: "Entrada no pátio", desc: "Veículo recebido — Setor A vaga 142", color: "info" },
              { d: "10/05/2024 14:20", t: "Fotos de check-in (12)", desc: "Estado: avariado lateralmente", color: "info" },
              { d: "12/05/2024 14:20", t: "Laudo emitido", desc: "Perito: M. Costa", color: "gold" },
              { d: "13/05/2024 10:15", t: "Em análise pericial", desc: "Aguardando alvará judicial", color: "warning" },
              { d: "—", t: "Próxima etapa", desc: "Decisão judicial pendente", color: "muted" },
            ].map((e, i) => (
              <li key={i} className="ml-5">
                <span className={`absolute -left-[7px] h-3 w-3 rounded-full bg-${e.color} border-2 border-sidebar`} />
                <p className="text-xs text-muted-foreground">{e.d}</p>
                <p className="font-semibold text-sm">{e.t}</p>
                <p className="text-xs text-muted-foreground">{e.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
