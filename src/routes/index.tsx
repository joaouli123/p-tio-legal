import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Car,
  Flame,
  RotateCcw,
  ScanSearch,
  Plus,
  Download,
  ArrowUpRight,
  Activity,
  FileCheck2,
  ReceiptText,
  Truck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getServicoStats, getVeiculos, type ServicoStats, type Veiculo, type VehicleStatus } from "@/lib/db";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Pátio Legal Maringá SAT" },
      {
        name: "description",
        content:
          "Painel de gestão integrado de veículos apreendidos. Controle total, segurança jurídica e transparência.",
      },
    ],
  }),
});

type ActivityColor = "gold" | "success" | "destructive" | "info";

type DashboardActivity = {
  id: string;
  plate: string;
  action: string;
  user: string;
  time: string;
  icon: typeof Truck;
  color: ActivityColor;
  vehicleId: string;
};

const EMPTY_STATS = { no_patio: 0, em_analise: 0, destruido: 0, restituido: 0, leilao: 0, doacao: 0, aguardando: 0, total: 0 };

const EMPTY_SERVICO_STATS: ServicoStats = {
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
};

function deriveVehicleStats(veiculos: Veiculo[]) {
  const stats = { ...EMPTY_STATS };
  for (const v of veiculos) {
    if (v.status in stats) stats[v.status] += 1;
    stats.total += 1;
  }
  return stats;
}

// Real "entradas por dia" series for the last 30 days, derived from the loaded
// vehicle list (created_at). Replaces the previous hardcoded mock series.
function buildEntriesSeries(veiculos: Veiculo[]) {
  const days = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const v of veiculos) {
    const key = new Date(v.created_at).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([iso, entradas]) => ({
    dia: iso.slice(8, 10),
    entradas,
  }));
}

function formatRelativeTime(value: string) {
  const now = Date.now();
  const diffMinutes = Math.max(1, Math.round((now - new Date(value).getTime()) / 60000));

  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
}

function getActivityMeta(status: VehicleStatus) {
  switch (status) {
    case "destruido":
      return { action: "Destruição finalizada", icon: Flame, color: "destructive" as const };
    case "restituido":
      return { action: "Restituição concluída", icon: RotateCcw, color: "success" as const };
    case "em_analise":
      return { action: "Veículo em análise", icon: ScanSearch, color: "gold" as const };
    default:
      return { action: "Entrada registrada", icon: Truck, color: "info" as const };
  }
}

function buildDashboardActivities(veiculos: Veiculo[]): DashboardActivity[] {
  return veiculos.slice(0, 5).map((veiculo) => {
    const meta = getActivityMeta(veiculo.status);

    return {
      id: veiculo.id,
      plate: veiculo.placa,
      action: meta.action,
      user: veiculo.delegacia_nome ?? "Sistema",
      time: formatRelativeTime(veiculo.updated_at ?? veiculo.created_at),
      icon: meta.icon,
      color: meta.color,
      vehicleId: veiculo.id,
    };
  });
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-muted/50" />
        <div className="h-8 w-16 rounded bg-muted/60" />
        <div className="h-3 w-20 rounded bg-muted/40" />
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [servicoStats, setServicoStats] = useState<ServicoStats>(EMPTY_SERVICO_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([getVeiculos(), getServicoStats()])
      .then(([veiculosData, servicos]) => {
        setVeiculos(veiculosData);
        setServicoStats(servicos);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Não foi possível carregar o painel.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => deriveVehicleStats(veiculos), [veiculos]);
  const recentVehicles = useMemo(() => veiculos.slice(0, 5), [veiculos]);
  const entriesSeries = useMemo(() => buildEntriesSeries(veiculos), [veiculos]);
  const recentActivity = useMemo(() => buildDashboardActivities(recentVehicles), [recentVehicles]);

  const pieData = useMemo(
    () => [
      { name: "No pátio", value: stats.no_patio, color: "var(--info)" },
      { name: "Em análise", value: stats.em_analise, color: "var(--warning)" },
      { name: "Destruídos", value: stats.destruido, color: "var(--destructive)" },
      { name: "Restituídos", value: stats.restituido, color: "var(--success)" },
    ],
    [stats],
  );

  const isEmpty = !loading && !error && veiculos.length === 0;

  const openVehicles = (status?: VehicleStatus) => {
    void navigate({
      to: "/veiculos",
      search: (status ? { status } : {}) as never,
    });
  };

  const openCobrancas = () => {
    void navigate({ to: "/cobrancas" });
  };

  return (
    <>
      <PageHeader
        eyebrow="Visão geral do sistema"
        title="Dashboard operacional"
        description="Indicadores da operação do pátio, calculados a partir dos veículos cadastrados."
        actions={
          <>
            <Button variant="outline" className="gap-2 border-border" onClick={() => void navigate({ to: "/relatorios" })}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold" onClick={() => void navigate({ to: "/veiculos", search: { openNew: true } as never })}>
              <Plus className="h-4 w-4" />
              Novo veículo
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-5 shadow-elegant flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-destructive flex-1">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Falha ao carregar o painel</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2 border-border" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <button type="button" className="text-left" aria-label={`Ver veículos no pátio (${stats.no_patio})`} onClick={() => openVehicles("no_patio")}>
              <StatCard label="Veículos no pátio" value={String(stats.no_patio)} delta="" trend="up" icon={Car} variant="info" />
            </button>
            <button type="button" className="text-left" aria-label={`Ver veículos em análise (${stats.em_analise})`} onClick={() => openVehicles("em_analise")}>
              <StatCard label="Em análise" value={String(stats.em_analise)} delta="" trend="up" icon={ScanSearch} variant="gold" />
            </button>
            <button type="button" className="text-left" aria-label={`Ver veículos destruídos (${stats.destruido})`} onClick={() => openVehicles("destruido")}>
              <StatCard label="Destruições" value={String(stats.destruido)} delta="" trend="up" icon={Flame} variant="destructive" />
            </button>
            <button type="button" className="text-left" aria-label={`Ver veículos restituídos (${stats.restituido})`} onClick={() => openVehicles("restituido")}>
              <StatCard label="Restituições" value={String(stats.restituido)} delta="" trend="up" icon={RotateCcw} variant="success" />
            </button>
            <button type="button" className="text-left" aria-label="Ver cobranças — total cobrado" onClick={openCobrancas}>
              <StatCard
                label="Total cobrado"
                value={formatCompactCurrency(servicoStats.totalCobrado)}
                delta={`${servicoStats.totalServicos} lançamento(s)`}
                trend="neutral"
                icon={ReceiptText}
                variant="gold"
              />
            </button>
            <button type="button" className="text-left" aria-label="Ver cobranças pendentes" onClick={openCobrancas}>
              <StatCard
                label="Pendente"
                value={formatCompactCurrency(servicoStats.totalPendente)}
                delta={`${servicoStats.servicosPendentes} pendência(s)`}
                trend={servicoStats.totalPendente > 0 ? "down" : "up"}
                icon={Activity}
                variant={servicoStats.totalPendente > 0 ? "destructive" : "success"}
              />
            </button>
            <button type="button" className="text-left" aria-label={`Ver destinações (${stats.doacao})`} onClick={() => openVehicles("doacao")}>
              <StatCard label="Destinações" value={String(stats.doacao)} delta="" trend="up" icon={FileCheck2} variant="gold" />
            </button>
          </>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-xl bg-gradient-card border border-border p-12 shadow-elegant flex flex-col items-center justify-center gap-3 text-center">
          <Car className="h-12 w-12 text-muted-foreground opacity-40" />
          <div>
            <p className="font-semibold text-lg">Nenhum veículo registrado ainda</p>
            <p className="text-sm text-muted-foreground">Cadastre o primeiro veículo para ver os indicadores da operação.</p>
          </div>
          <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold" onClick={() => void navigate({ to: "/veiculos", search: { openNew: true } as never })}>
            <Plus className="h-4 w-4" /> Cadastrar veículo
          </Button>
        </div>
      ) : (
        <>
          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Entradas no pátio</h3>
                  <p className="text-xs text-muted-foreground">Veículos cadastrados por dia — últimos 30 dias</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-gold" /> Entradas
                  </span>
                </div>
              </div>
              {loading ? (
                <div className="h-[280px] w-full animate-pulse rounded-lg bg-muted/30" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={entriesSeries}>
                    <defs>
                      <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 260 / 40%)" />
                    <XAxis dataKey="dia" stroke="oklch(0.70 0.025 255)" fontSize={11} />
                    <YAxis stroke="oklch(0.70 0.025 255)" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.18 0.03 260)",
                        border: "1px solid oklch(0.758 0.152 75 / 30%)",
                        borderRadius: "8px",
                        color: "oklch(0.97 0.01 250)",
                      }}
                    />
                    <Area type="monotone" dataKey="entradas" name="Entradas" stroke="var(--gold)" strokeWidth={2} fill="url(#gGold)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
              <h3 className="font-semibold text-lg mb-1">Status dos veículos</h3>
              <p className="text-xs text-muted-foreground mb-4">Distribuição atual</p>
              {loading ? (
                <div className="h-[220px] w-full animate-pulse rounded-lg bg-muted/30" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="oklch(0.16 0.03 260)"
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.18 0.03 260)",
                        border: "1px solid oklch(0.758 0.152 75 / 30%)",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="space-y-2 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Atividades + Veículos recentes */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h3 className="font-semibold text-lg">Veículos recentes</h3>
                  <p className="text-xs text-muted-foreground">Últimas movimentações registradas</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-gold gap-1">
                  <Link to="/veiculos" search={{ status: "todos", q: "", openNew: false }}>
                    Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 w-full animate-pulse rounded bg-muted/30" />
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground bg-muted/20">
                        <th className="px-5 py-3 font-medium">Placa</th>
                        <th className="px-5 py-3 font-medium">Modelo</th>
                        <th className="px-5 py-3 font-medium">Ano</th>
                        <th className="px-5 py-3 font-medium">Origem</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVehicles.map((v) => (
                        <tr key={v.id} className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => void navigate({ to: "/veiculos/$id", params: { id: v.id } })}>
                          <td className="px-5 py-3 font-mono font-semibold text-gold">{v.placa}</td>
                          <td className="px-5 py-3">{v.marca_modelo}</td>
                          <td className="px-5 py-3 text-muted-foreground">{v.ano ?? '—'}</td>
                          <td className="px-5 py-3 text-muted-foreground">{v.delegacia_nome ?? '—'}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={v.status as any} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gold" />
                    Atividade recente
                  </h3>
                  <p className="text-xs text-muted-foreground">Trilha de auditoria</p>
                </div>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/30" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((a) => {
                    const Icon = a.icon;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          className="flex w-full gap-3 group rounded-lg p-1 text-left hover:bg-muted/20 transition-colors"
                          onClick={() => void navigate({ to: "/veiculos/$id", params: { id: a.vehicleId } })}
                        >
                          <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border bg-${a.color}/10 border-${a.color}/30`}>
                            <Icon className={`h-4 w-4 text-${a.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              <span className="text-gold font-mono">{a.plate}</span> — {a.action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {a.user} • {a.time}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
