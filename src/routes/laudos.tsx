import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, FileCheck2, QrCode, Eye, Lock } from "lucide-react";

export const Route = createFileRoute("/laudos")({
  component: LaudosPage,
  head: () => ({ meta: [{ title: "Laudos — Pátio Legal" }] }),
});

const laudos = [
  { num: "LD-2026-0287", placa: "ZXC7G89", data: "20/05/2024 14:20", perito: "M. Costa", status: "Emitido" },
  { num: "LD-2026-0286", placa: "QWE4F56", data: "19/05/2024 11:05", perito: "P. Almeida", status: "Emitido" },
  { num: "LD-2026-0285", placa: "RTY8K90", data: "18/05/2024 16:42", perito: "L. Mendes", status: "Emitido" },
  { num: "LD-2026-0284", placa: "FGH4M56", data: "17/05/2024 09:15", perito: "M. Costa", status: "Emitido" },
];

function LaudosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Documentos com validade jurídica"
        title="Laudos periciais"
        description="Documentos imutáveis após emissão. Auditáveis por hash SHA-256 e QR Code."
        actions={
          <Button variant="outline" className="gap-2 border-border">
            <Download className="h-4 w-4" /> Exportar lista
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número de laudo, placa ou perito…" className="pl-10 bg-muted/40" />
          </div>

          {laudos.map((l) => (
            <div key={l.num} className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant hover:border-gold-subtle transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                  <FileCheck2 className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-gold">{l.num}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span>Placa: <span className="text-foreground font-mono">{l.placa}</span></span>
                    <span>{l.data}</span>
                    <span>Perito: {l.perito}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-success/15 text-success border border-success/30 shrink-0 hidden sm:inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> {l.status}
                </span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-gold"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-gold"><Download className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gradient-card border border-gold/30 p-6 shadow-glow h-fit">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold mb-2">Pré-visualização</p>
          <h3 className="font-bold text-lg mb-4">LD-2026-0287</h3>

          <div className="rounded-lg bg-background p-5 border border-border space-y-3 text-xs">
            <div className="text-center pb-3 border-b border-border">
              <p className="font-bold text-sm text-gold">PÁTIO LEGAL MARINGÁ SAT</p>
              <p className="text-muted-foreground text-[10px]">LAUDO DE DESTRUIÇÃO DE VEÍCULO</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Nº:</span> <span className="font-mono">2026/0287</span></div>
              <div><span className="text-muted-foreground">Placa:</span> <span className="font-mono">ZXC7G89</span></div>
              <div><span className="text-muted-foreground">Marca/Modelo:</span> Fiat Strada</div>
              <div><span className="text-muted-foreground">Ano:</span> 2014/2015</div>
              <div className="col-span-2"><span className="text-muted-foreground">Chassi:</span> <span className="font-mono">9BD27801M9R456321</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Processo:</span> <span className="font-mono">0003456-78.2024.8.16.0190</span></div>
            </div>
            <div className="flex justify-center pt-2">
              <div className="h-24 w-24 bg-foreground rounded grid grid-cols-8 grid-rows-8 gap-px p-1">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className={Math.random() > 0.5 ? "bg-background" : ""} />
                ))}
              </div>
            </div>
            <p className="text-center text-[9px] text-muted-foreground flex items-center justify-center gap-1">
              <QrCode className="h-3 w-3" /> Escaneie para acessar o vídeo
            </p>
            <p className="text-center text-[8px] font-mono text-muted-foreground break-all border-t border-border pt-2">
              SHA-256: a9f5c2e8b1d47632c0a81f9d6e3b5a274c9e0f1d8b6a3e5c2f7d9b0a1e4c6f8d
            </p>
          </div>

          <Button className="w-full mt-4 gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
            <Download className="h-4 w-4" /> Baixar PDF completo
          </Button>
        </div>
      </div>
    </>
  );
}
