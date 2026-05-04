import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
  head: () => ({ meta: [{ title: "Relatórios — Pátio Legal" }] }),
});

const monthly = [
  { mes: "Jan", entradas: 320, destruidos: 145, restituidos: 89 },
  { mes: "Fev", entradas: 285, destruidos: 132, restituidos: 76 },
  { mes: "Mar", entradas: 410, destruidos: 198, restituidos: 102 },
  { mes: "Abr", entradas: 380, destruidos: 175, restituidos: 95 },
  { mes: "Mai", entradas: 462, destruidos: 228, restituidos: 125 },
];

function RelatoriosPage() {
  return (
    <>
      <PageHeader
        eyebrow="BI e exportações"
        title="Relatórios gerenciais"
        description="Visão executiva para tomada de decisão. Exportações em CSV e PDF com filtros avançados."
        actions={
          <>
            <Button variant="outline" className="gap-2 border-border">
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
            <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Período", v: "01/05 — 31/05" },
          { l: "Total de entradas", v: "1.857" },
          { l: "Destruições", v: "878" },
          { l: "Taxa de restituição", v: "12,3%" },
        ].map((c) => (
          <div key={c.l} className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.l}</p>
            <p className="text-2xl font-bold mt-1 text-gold">{c.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
        <h3 className="font-semibold text-lg mb-1">Resumo mensal — 2024</h3>
        <p className="text-xs text-muted-foreground mb-4">Comparativo de entradas, destruições e restituições</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 260 / 40%)" />
            <XAxis dataKey="mes" stroke="oklch(0.70 0.025 255)" fontSize={12} />
            <YAxis stroke="oklch(0.70 0.025 255)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "oklch(0.18 0.03 260)",
                border: "1px solid oklch(0.80 0.14 85 / 30%)",
                borderRadius: "8px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="entradas" fill="oklch(0.80 0.14 85)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="destruidos" fill="oklch(0.62 0.22 25)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="restituidos" fill="oklch(0.68 0.16 152)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
          <h3 className="font-semibold mb-3">Por delegacia de origem</h3>
          <ul className="space-y-2 text-sm">
            {[
              { n: "18ª SDP Maringá", v: 412 },
              { n: "1ª DP Maringá", v: 298 },
              { n: "2ª DP Maringá", v: 256 },
              { n: "DENARC", v: 187 },
              { n: "Vara Criminal", v: 95 },
            ].map((d) => (
              <li key={d.n} className="flex items-center justify-between">
                <span className="text-muted-foreground">{d.n}</span>
                <span className="font-bold text-gold">{d.v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
          <h3 className="font-semibold mb-3">Por tipo de bem</h3>
          <ul className="space-y-2 text-sm">
            {[
              { n: "Automóveis", v: 728 },
              { n: "Motocicletas", v: 412 },
              { n: "Caminhões", v: 64 },
              { n: "Peças/Motores", v: 39 },
              { n: "Outros", v: 5 },
            ].map((d) => (
              <li key={d.n} className="flex items-center justify-between">
                <span className="text-muted-foreground">{d.n}</span>
                <span className="font-bold text-gold">{d.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
