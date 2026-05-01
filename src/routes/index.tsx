import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
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
  Camera,
  FileCheck2,
  Truck,
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
  Legend,
} from "recharts";

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

const areaData = [
  { dia: "01", entradas: 32, saidas: 18 },
  { dia: "05", entradas: 41, saidas: 22 },
  { dia: "10", entradas: 38, saidas: 31 },
  { dia: "15", entradas: 55, saidas: 28 },
  { dia: "20", entradas: 48, saidas: 35 },
  { dia: "25", entradas: 62, saidas: 41 },
  { dia: "30", entradas: 58, saidas: 47 },
];

const pieData = [
  { name: "No pátio", value: 525, color: "var(--info)" },
  { name: "Em análise", value: 342, color: "var(--warning)" },
  { name: "Destruídos", value: 263, color: "var(--destructive)" },
  { name: "Restituídos", value: 125, color: "var(--success)" },
];

const recentActivity = [
  { id: 1, plate: "ABC1D23", action: "Entrada registrada", user: "J. Silva", time: "há 4 min", icon: Truck, color: "info" },
  { id: 2, plate: "QWE4F56", action: "Laudo emitido LD-2026-0287", user: "M. Costa", time: "há 12 min", icon: FileCheck2, color: "gold" },
  { id: 3, plate: "ZXC7G89", action: "Destruição finalizada", user: "P. Almeida", time: "há 38 min", icon: Flame, color: "destructive" },
  { id: 4, plate: "POI2H34", action: "Fotos adicionadas (8)", user: "R. Souza", time: "há 1 h", icon: Camera, color: "info" },
  { id: 5, plate: "MNB5J67", action: "Restituído ao proprietário", user: "L. Mendes", time: "há 2 h", icon: RotateCcw, color: "success" },
];

const recentVehicles = [
  { plate: "ABC1D23", model: "VW Gol 1.0", year: "2010/2011", origin: "18ª SDP Maringá", status: "em-analise" as const },
  { plate: "QWE4F56", model: "Honda CG 160", year: "2018/2019", origin: "1ª DP Maringá", status: "no-patio" as const },
  { plate: "ZXC7G89", model: "Fiat Strada", year: "2014/2015", origin: "Vara Criminal", status: "destruido" as const },
  { plate: "POI2H34", model: "Chevrolet Onix", year: "2020/2021", origin: "DENARC", status: "leilao" as const },
  { plate: "MNB5J67", model: "Toyota Corolla", year: "2019/2020", origin: "2ª DP Maringá", status: "restituido" as const },
];

function Dashboard() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Visão geral do sistema"
        title="Dashboard operacional"
        description="Indicadores em tempo real de toda a operação do pátio. Dados atualizados a cada 30 segundos."
        actions={
          <>
            <Button variant="outline" className="gap-2 border-border">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              <Plus className="h-4 w-4" />
              Novo veículo
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Veículos no pátio" value="1.248" delta="+8,2% no mês" trend="up" icon={Car} variant="info" />
        <StatCard label="Em análise" value="342" delta="+12 hoje" trend="up" icon={ScanSearch} variant="gold" />
        <StatCard label="Destruições" value="678" delta="+34 esta semana" trend="up" icon={Flame} variant="destructive" />
        <StatCard label="Restituições" value="228" delta="+5,1% no mês" trend="up" icon={RotateCcw} variant="success" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Movimentação do pátio</h3>
              <p className="text-xs text-muted-foreground">Entradas e saídas — últimos 30 dias</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gold" /> Entradas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-info" /> Saídas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.80 0.14 85)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="oklch(0.80 0.14 85)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.68 0.13 235)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="oklch(0.68 0.13 235)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 260 / 40%)" />
              <XAxis dataKey="dia" stroke="oklch(0.70 0.025 255)" fontSize={11} />
              <YAxis stroke="oklch(0.70 0.025 255)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.18 0.03 260)",
                  border: "1px solid oklch(0.80 0.14 85 / 30%)",
                  borderRadius: "8px",
                  color: "oklch(0.97 0.01 250)",
                }}
              />
              <Area type="monotone" dataKey="entradas" stroke="oklch(0.80 0.14 85)" strokeWidth={2} fill="url(#gGold)" />
              <Area type="monotone" dataKey="saidas" stroke="oklch(0.68 0.13 235)" strokeWidth={2} fill="url(#gInfo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
          <h3 className="font-semibold text-lg mb-1">Status dos veículos</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição atual</p>
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
                  border: "1px solid oklch(0.80 0.14 85 / 30%)",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
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
              <Link to="/veiculos">
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
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
                  <tr key={v.plate} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-gold">{v.plate}</td>
                    <td className="px-5 py-3">{v.model}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.year}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.origin}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <ul className="space-y-3">
            {recentActivity.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id} className="flex gap-3 group">
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
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
