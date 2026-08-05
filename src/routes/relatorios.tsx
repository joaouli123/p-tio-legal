import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { buildManagementReportDocument, buildVehicleSummaryDocument, downloadPdfDocument, downloadWordDocument, shareDocumentViaWhatsApp } from "@/lib/document-utils";
import { DocumentPreview } from "@/components/DocumentPreview";
import { getServicoStats, getVeiculoStats, getVeiculos, getLaudos, type ServicoStats, type Veiculo } from "@/lib/db";
import { FilePenLine, FileText, MessageCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
  head: () => ({ meta: [{ title: "Relatórios — Pátio Legal" }] }),
});

function buildPeriodLabel() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${formatter.format(start)} — ${formatter.format(end)}`;
}

function buildMonthlySeries(veiculos: Veiculo[]) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  const months = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (4 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      mes: formatter.format(date).replace(/\.$/, "").replace(/^./, (letter) => letter.toUpperCase()),
      entradas: 0,
      destruidos: 0,
      restituidos: 0,
    };
  });

  const monthMap = new Map(months.map((item) => [item.key, item]));

  veiculos.forEach((veiculo) => {
    const createdAt = new Date(veiculo.created_at);
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const month = monthMap.get(key);
    if (!month) return;

    month.entradas += 1;
    if (veiculo.status === "destruido") month.destruidos += 1;
    if (veiculo.status === "restituido") month.restituidos += 1;
  });

  return months;
}

function countBy(items: Veiculo[], accessor: (item: Veiculo) => string | null | undefined, format?: (value: string) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const rawValue = accessor(item) ?? "Não informado";
    counts.set(rawValue, (counts.get(rawValue) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([name, value]) => ({ n: format ? format(name) : name, v: value }));
}

function formatVehicleType(value: string) {
  const labels: Record<string, string> = {
    automovel: "Automóveis",
    motocicleta: "Motocicletas",
    caminhao: "Caminhões",
    van_utilitario: "Vans/Utilitários",
    onibus: "Ônibus",
    outro: "Outros",
  };

  return labels[value] ?? value;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function RelatoriosPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [stats, setStats] = useState({ no_patio: 0, em_analise: 0, destruido: 0, restituido: 0, leilao: 0, doacao: 0, aguardando: 0, total: 0 });
  const [laudos, setLaudos] = useState<{ numero: string; placa: string; emitido_em: string }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  const [servicoStats, setServicoStats] = useState<ServicoStats>({
    totalServicos: 0,
    totalCobrado: 0,
    totalPago: 0,
    totalPendente: 0,
    servicosPagos: 0,
    servicosPendentes: 0,
    veiculosComCobranca: 0,
    ticketMedio: 0,
    adimplenciaPercent: 0,
    tipos: [],
  });

  useEffect(() => {
    Promise.all([getVeiculoStats(), getVeiculos(), getServicoStats(), getLaudos()])
      .then(([statsData, veiculosData, servicosData, laudosData]) => {
        setStats(statsData);
        setVeiculos(veiculosData);
        setServicoStats(servicosData);
        setLaudos(
          laudosData.map((l) => ({
            numero: l.numero,
            placa: (l as unknown as { veiculos?: { placa?: string } }).veiculos?.placa ?? "—",
            emitido_em: l.emitido_em,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const periodLabel = useMemo(() => buildPeriodLabel(), []);
  const monthly = useMemo(() => buildMonthlySeries(veiculos), [veiculos]);
  const delegacias = useMemo(() => countBy(veiculos, (item) => item.delegacia_nome), [veiculos]);
  const tipos = useMemo(() => countBy(veiculos, (item) => item.tipo, formatVehicleType), [veiculos]);
  const cobrancasSummary = useMemo(() => ([
    `Cobranças lançadas: ${servicoStats.totalServicos}.`,
    `Veículos com cobrança: ${servicoStats.veiculosComCobranca}.`,
    `Total cobrado: ${formatBRL(servicoStats.totalCobrado)}.`,
    `Total pago: ${formatBRL(servicoStats.totalPago)}.`,
    `Pendente: ${formatBRL(servicoStats.totalPendente)}.`,
    `Adimplência: ${servicoStats.adimplenciaPercent.toFixed(1).replace('.', ',')}%.`,
  ]), [servicoStats.adimplenciaPercent, servicoStats.totalCobrado, servicoStats.totalPago, servicoStats.totalPendente, servicoStats.totalServicos, servicoStats.veiculosComCobranca]);

  const tiposCobranca = useMemo(() => servicoStats.tipos.slice(0, 5).map((item) => ({
    n: item.label,
    v: `${item.lancamentos} lançamento(s) · ${formatBRL(item.total)}`,
  })), [servicoStats.tipos]);

  const summaryCards = useMemo(() => ([
    { l: "Período", v: periodLabel },
    { l: "Total de entradas", v: String(veiculos.length) },
    { l: "Destruições", v: String(stats.destruido) },
    { l: "Cobranças lançadas", v: String(servicoStats.totalServicos) },
    { l: "Veículos cobrados", v: String(servicoStats.veiculosComCobranca) },
    { l: "Total cobrado", v: formatBRL(servicoStats.totalCobrado) },
    { l: "Total pago", v: formatBRL(servicoStats.totalPago) },
    { l: "Pendente", v: formatBRL(servicoStats.totalPendente) },
  ]), [periodLabel, servicoStats.totalCobrado, servicoStats.totalPago, servicoStats.totalPendente, servicoStats.totalServicos, servicoStats.veiculosComCobranca, stats.destruido, veiculos.length]);

  const reportDocument = buildManagementReportDocument({
    periodLabel,
    cards: summaryCards.map((item) => ({ label: item.l, value: item.v })),
    monthly,
    delegacias,
    tipos,
    cobrancasSummary,
    tiposCobranca,
    vehicleList: veiculos,
    laudosList: laudos,
  });
  const selectedVehicleDocument = selectedVehicle ? buildVehicleSummaryDocument({ veiculo: selectedVehicle }) : null;

  return (
    <>
      <PageHeader
        eyebrow="BI e exportações"
        title="Relatórios gerenciais"
        description="Visão executiva para tomada de decisão. Todos os relatórios podem ser exportados em Word, PDF e enviados por WhatsApp."
        actions={
          <>
            <Button variant="outline" className="gap-2 border-border" onClick={() => void downloadWordDocument(reportDocument)}>
              <FilePenLine className="h-4 w-4" /> Word
            </Button>
            <Button variant="outline" className="gap-2 border-border" onClick={() => void downloadPdfDocument(reportDocument)}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button className="gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]" onClick={() => void shareDocumentViaWhatsApp(reportDocument, "pdf")}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="rounded-xl bg-gradient-card border border-border p-8 shadow-elegant text-sm text-muted-foreground">
          Carregando indicadores do relatório…
        </div>
      ) : (
        <>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <div key={card.l} className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.l}</p>
                <p className="text-2xl font-bold mt-1 text-gold">{card.v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
            <h3 className="font-semibold text-lg mb-1">Resumo mensal</h3>
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
                {delegacias.map((item) => (
                  <li key={item.n} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.n}</span>
                    <span className="font-bold text-gold">{item.v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
              <h3 className="font-semibold mb-3">Por tipo de bem</h3>
              <ul className="space-y-2 text-sm">
                {tipos.map((item) => (
                  <li key={item.n} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.n}</span>
                    <span className="font-bold text-gold">{item.v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
              <h3 className="font-semibold mb-3">Cobranças e serviços</h3>
              <ul className="space-y-2 text-sm">
                {cobrancasSummary.map((item) => (
                  <li key={item} className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">{item.replace(/\.$/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
              <h3 className="font-semibold mb-3">Principais cobranças</h3>
              <ul className="space-y-2 text-sm">
                {tiposCobranca.length > 0 ? tiposCobranca.map((item) => (
                  <li key={item.n} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{item.n}</span>
                    <span className="font-bold text-gold text-right">{item.v}</span>
                  </li>
                )) : (
                  <li className="text-muted-foreground">Nenhuma cobrança registrada no período.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)] gap-4">
            <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold text-lg">Relatórios por veículo</h3>
                <p className="text-xs text-muted-foreground">Clique na placa ou no processo para abrir o cadastro completo.</p>
              </div>
              <div className="divide-y divide-border">
                {veiculos.map((veiculo) => (
                  <div key={veiculo.id} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <button type="button" className="font-mono font-bold text-gold hover:underline" onClick={() => { setSelectedVehicle(veiculo); }}>{veiculo.placa}</button>
                    <span className="text-sm text-muted-foreground flex-1 min-w-44">{veiculo.marca_modelo}</span>
                    <button type="button" className="text-sm font-mono text-muted-foreground hover:text-gold hover:underline" onClick={() => { setSelectedVehicle(veiculo); }}>{veiculo.processo ?? "Sem processo"}</button>
                    <Button variant="outline" size="sm" onClick={() => void navigate({ to: "/veiculos/$id", params: { id: veiculo.id }, search: { status: "todos", q: "", openNew: false } })}>Cadastro completo</Button>
                    <Button variant="ghost" size="sm" onClick={() => void downloadPdfDocument(buildVehicleSummaryDocument({ veiculo }))}>PDF</Button>
                  </div>
                ))}
                {veiculos.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nenhum veículo encontrado.</p>}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-card border border-gold/30 p-5 shadow-glow h-fit">
              {selectedVehicleDocument ? (
                <>
                  <h3 className="font-semibold mb-3">Relatório completo</h3>
                  <DocumentPreview document={selectedVehicleDocument} />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => void downloadWordDocument(selectedVehicleDocument)}>Word</Button>
                    <Button size="sm" onClick={() => void downloadPdfDocument(selectedVehicleDocument)}>PDF</Button>
                  </div>
                </>
              ) : <p className="text-sm text-muted-foreground">Selecione uma placa ou processo para visualizar o relatório completo.</p>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
