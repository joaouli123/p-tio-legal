import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Car,
  Flame,
  RotateCcw,
  ScanLine,
  Bell,
  Home,
  ClipboardList,
  User,
  Lock,
  Fingerprint,
  MapPin,
  Wifi,
  CheckCircle2,
  Clock,
  Video,
  AlertTriangle,
  FileCheck2,
  QrCode,
  Hash,
  Plus,
  Search,
  Truck,
  X,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppMobilePreview,
  head: () => ({
    meta: [{ title: "App Operacional — Pátio Legal" }],
  }),
});

type ScreenId =
  | "splash"
  | "login"
  | "home"
  | "scan"
  | "vehicle"
  | "entrada"
  | "destruicao"
  | "laudo"
  | "checklist"
  | "perfil";

function AppMobilePreview() {
  const screens: { id: ScreenId; label: string; component: React.FC<{ go: (s: ScreenId) => void }> }[] = [
    { id: "splash", label: "Splash", component: SplashScreen },
    { id: "login", label: "Login", component: LoginScreen },
    { id: "home", label: "Home", component: HomeScreen },
    { id: "scan", label: "Scanner QR", component: ScanScreen },
    { id: "vehicle", label: "Detalhe veículo", component: VehicleScreen },
    { id: "entrada", label: "Entrada de veículo", component: EntradaScreen },
    { id: "checklist", label: "Checklist", component: ChecklistScreen },
    { id: "destruicao", label: "Destruição", component: DestruicaoScreen },
    { id: "laudo", label: "Laudo gerado", component: LaudoScreen },
    { id: "perfil", label: "Perfil", component: PerfilScreen },
  ];

  const [active, setActive] = useState<ScreenId>("home");
  const ActiveComp = screens.find((s) => s.id === active)?.component ?? HomeScreen;

  return (
    <div className="min-h-screen w-full bg-background flex justify-center">
      {/* Container responsivo: full width no mobile, max-w no desktop */}
      <div className="w-full max-w-[480px] min-h-screen bg-background relative shadow-elegant overflow-hidden">
        <ActiveComp go={setActive} />
      </div>
    </div>
  );
}

/* ────────────────────────────  TELAS  ──────────────────────────── */

function SplashScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-hero p-6 text-center">
      <div className="animate-pulse-gold rounded-full p-1 mb-6">
        <Logo size="xl" showText={false} />
      </div>
      <h1 className="text-2xl font-bold tracking-wider">PÁTIO LEGAL</h1>
      <p className="text-[11px] tracking-[0.3em] text-gold uppercase mt-1">Maringá SAT</p>
      <p className="text-xs text-muted-foreground mt-8 max-w-[220px]">
        Sistema integrado de gestão e destinação veicular
      </p>
      <div className="mt-10 h-1 w-32 rounded-full bg-muted overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-gold animate-shimmer" />
      </div>
      <button
        onClick={() => go("login")}
        className="mt-8 text-[11px] text-gold underline underline-offset-4"
      >
        Continuar →
      </button>
    </div>
  );
}

function LoginScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="h-full flex flex-col p-6 bg-gradient-hero">
      <div className="flex justify-center mt-6 mb-8">
        <Logo size="lg" showText={false} />
      </div>
      <h2 className="text-xl font-bold text-center">Acesso operacional</h2>
      <p className="text-xs text-muted-foreground text-center mt-1 mb-8">
        Use suas credenciais institucionais
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">
            Matrícula
          </label>
          <Input defaultValue="OPR-2381" className="bg-muted/40" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input type="password" defaultValue="••••••••" className="bg-muted/40 pl-9" />
          </div>
        </div>
      </div>

      <Button
        onClick={() => go("home")}
        className="mt-6 w-full bg-gradient-gold text-primary-foreground font-semibold"
      >
        Entrar
      </Button>

      <button className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Fingerprint className="h-4 w-4 text-gold" /> Entrar com biometria
      </button>

      <div className="mt-auto pt-6 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Wifi className="h-3 w-3 text-success" /> Online
        </span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}

function HomeScreen({ go }: { go: (s: ScreenId) => void }) {
  const actions = [
    { id: "entrada" as ScreenId, label: "Nova entrada", sub: "Cadastrar veículo", icon: Plus, color: "from-gold/30 to-gold/5 border-gold/40 text-gold" },
    { id: "scan" as ScreenId, label: "Scanner QR", sub: "Identificar bem", icon: ScanLine, color: "from-info/30 to-info/5 border-info/40 text-info" },
    { id: "destruicao" as ScreenId, label: "Destruição", sub: "Iniciar processo", icon: Flame, color: "from-destructive/30 to-destructive/5 border-destructive/40 text-destructive" },
    { id: "checklist" as ScreenId, label: "Vistoria", sub: "Checklist", icon: ClipboardList, color: "from-success/30 to-success/5 border-success/40 text-success" },
  ];
  const recent = [
    { plate: "ABC1D23", model: "Honda CG 160 Titan", time: "há 12 min", status: "Entrada", tone: "success" },
    { plate: "ZXC7G89", model: "Fiat Strada Adv", time: "há 1h", status: "Destruição", tone: "destructive" },
    { plate: "MNB4Y56", model: "Yamaha Factor 125", time: "há 2h", status: "Liberado", tone: "info" },
    { plate: "JKL9P22", model: "VW Gol G6", time: "hoje", status: "Vistoria", tone: "warning" },
  ];
  const week = [
    { d: "S", v: 38 },
    { d: "T", v: 52 },
    { d: "Q", v: 41 },
    { d: "Q", v: 67 },
    { d: "S", v: 73 },
    { d: "S", v: 28 },
    { d: "D", v: 19 },
  ];
  const maxV = Math.max(...week.map((w) => w.v));
  const alerts = [
    { t: "3 veículos com prazo > 90 dias", icon: AlertTriangle, tone: "text-warning bg-warning/15 border-warning/30" },
    { t: "Destruição agendada amanhã 09:00", icon: Flame, tone: "text-destructive bg-destructive/15 border-destructive/30" },
  ];

  return (
    <div className="min-h-full flex flex-col bg-background pb-24">
      {/* Hero header with gradient + bg pattern */}
      <div className="relative bg-gradient-hero px-5 pt-4 pb-8 border-b border-gold/20 overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 90% 0%, oklch(0.80 0.14 85 / 30%) 0%, transparent 50%)" }} />
        <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => go("perfil")}
              className="relative h-11 w-11 rounded-xl bg-gradient-gold flex items-center justify-center text-primary-foreground text-sm font-bold shadow-gold"
            >
              MA
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Operador</p>
              <p className="font-bold leading-tight">Marcos Almeida</p>
              <p className="text-[10px] text-muted-foreground">Matrícula OPR-2381</p>
            </div>
          </div>
          <button className="relative h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gold animate-pulse-gold" />
          </button>
        </div>

        <div className="relative flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-card/60 border border-border">
            <MapPin className="h-3 w-3 text-gold" /> Pátio Central — Maringá/PR
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/15 border border-success/30 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Online
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-card/60 border border-border text-muted-foreground ml-auto">
            <Wifi className="h-3 w-3" /> 5G
          </span>
        </div>
      </div>

      {/* KPI mega card */}
      <div className="px-5 -mt-5 relative z-10">
        <div className="rounded-2xl bg-gradient-card border border-gold/40 shadow-gold p-4 backdrop-blur-xl">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Movimentação hoje</p>
              <p className="text-3xl font-bold text-gradient-gold leading-none mt-1">12</p>
              <p className="text-[10px] text-success mt-1">▲ 24% vs. ontem</p>
            </div>
            {/* Mini sparkline */}
            <svg viewBox="0 0 100 40" className="w-28 h-12">
              <defs>
                <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.80 0.14 85)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="oklch(0.80 0.14 85)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,30 L15,22 L30,28 L45,15 L60,18 L75,8 L100,12 L100,40 L0,40 Z" fill="url(#spark)" />
              <path d="M0,30 L15,22 L30,28 L45,15 L60,18 L75,8 L100,12" fill="none" stroke="oklch(0.80 0.14 85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/60">
            {[
              { label: "No pátio", value: "847", tone: "text-foreground" },
              { label: "Pendentes", value: "5", tone: "text-warning" },
              { label: "Críticos", value: "2", tone: "text-destructive" },
            ].map((k) => (
              <div key={k.label} className="text-center">
                <p className={`text-lg font-bold ${k.tone}`}>{k.value}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Ações rápidas</h3>
          <span className="text-[10px] text-gold">4 disponíveis</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => go(a.id)}
                className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${a.color} p-4 text-left active:scale-[0.97] transition-all`}
              >
                <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-current opacity-10" />
                <Icon className="h-6 w-6 mb-2 relative" />
                <p className="text-sm font-bold relative">{a.label}</p>
                <p className="text-[10px] opacity-70 relative">{a.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekly chart */}
      <div className="px-5 mt-6">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold">Atividade semanal</h3>
              <p className="text-[10px] text-muted-foreground">Entradas por dia</p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-gold/15 text-gold border border-gold/30">7d</span>
          </div>
          <div className="flex items-end justify-between gap-1.5 h-24">
            {week.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-md ${i === 4 ? "bg-gradient-gold shadow-gold" : "bg-gold/25"}`}
                    style={{ height: `${(w.v / maxV) * 100}%` }}
                  />
                </div>
                <span className={`text-[10px] ${i === 4 ? "text-gold font-bold" : "text-muted-foreground"}`}>{w.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pátio occupation */}
      <div className="px-5 mt-6">
        <div className="rounded-xl bg-gradient-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold">Ocupação do pátio</h3>
              <p className="text-[10px] text-muted-foreground">847 / 1.200 vagas</p>
            </div>
            <span className="text-lg font-bold text-gold">70%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
            <div className="h-full bg-gradient-gold rounded-full" style={{ width: "70%" }} />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 24 }).map((_, i) => {
              const filled = i < 17;
              const critical = i === 5 || i === 12;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded ${
                    critical ? "bg-destructive/60" : filled ? "bg-gold/70" : "bg-muted/40"
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-gold/70" /> Ocupado</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-destructive/60" /> Crítico</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-muted/40" /> Livre</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="px-5 mt-6 space-y-2">
        {alerts.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${a.tone}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <p className="text-xs flex-1 font-medium">{a.t}</p>
              <ChevronRight className="h-4 w-4 opacity-60" />
            </div>
          );
        })}
      </div>

      {/* Recent */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Movimentações recentes</h3>
          <button className="text-[10px] text-gold">Ver todas</button>
        </div>
        <div className="space-y-2">
          {recent.map((r) => {
            const toneMap: Record<string, string> = {
              success: "bg-success/15 text-success border-success/30",
              destructive: "bg-destructive/15 text-destructive border-destructive/30",
              info: "bg-info/15 text-info border-info/30",
              warning: "bg-warning/15 text-warning border-warning/30",
            };
            return (
              <button
                key={r.plate}
                onClick={() => go("vehicle")}
                className="w-full rounded-xl bg-card border border-border p-3 flex items-center gap-3 hover:border-gold/40 transition active:scale-[0.98]"
              >
                <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center">
                  <Car className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-mono font-bold tracking-wider">{r.plate}</p>
                  <p className="text-[11px] text-muted-foreground">{r.model}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{r.time}</p>
                </div>
                <Badge className={`text-[10px] border ${toneMap[r.tone]}`}>{r.status}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav active="home" go={go} />
    </div>
  );
}

function ScanScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="h-full bg-black flex flex-col">
      <div className="px-5 pt-3 pb-3 flex items-center justify-between text-white">
        <button onClick={() => go("home")}>
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold">Escanear QR Code</p>
        <Bell className="h-5 w-5 opacity-0" />
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {/* Camera viewfinder */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[oklch(0.10_0.02_260)] to-black" />
        <div className="relative w-60 h-60">
          <div className="absolute inset-0 border-2 border-gold rounded-2xl" />
          <div className="absolute -inset-1 border border-gold/40 rounded-2xl animate-pulse" />
          {/* Corners */}
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
          ].map((c, i) => (
            <div key={i} className={`absolute h-8 w-8 border-gold ${c}`} />
          ))}
          {/* Scan line */}
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gold shadow-[0_0_12px_oklch(0.80_0.14_85)] animate-pulse" />
        </div>
      </div>

      <div className="px-5 py-6 text-center text-white space-y-3">
        <p className="text-sm">Aponte para o QR Code do veículo</p>
        <p className="text-xs text-muted-foreground">
          Identifica entrada, vistoria e destruição
        </p>
        <Button
          onClick={() => go("vehicle")}
          variant="outline"
          className="border-gold text-gold hover:bg-gold/10"
        >
          Simular leitura
        </Button>
      </div>
    </div>
  );
}

function VehicleScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="h-full flex flex-col bg-background pb-4">
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => go("home")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">Detalhes do veículo</p>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto">
        {/* Hero */}
        <div className="rounded-xl bg-gradient-card border border-gold/30 p-4 shadow-gold">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
              <Car className="h-6 w-6 text-gold" />
            </div>
            <div>
              <p className="font-mono font-bold text-xl text-gold">ZXC7G89</p>
              <p className="text-xs text-muted-foreground">Fiat Strada 2014/2015 • Vermelho</p>
            </div>
          </div>
          <Badge className="bg-warning/20 text-warning border border-warning/30">
            Aguardando destruição
          </Badge>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-card border border-border p-4 space-y-3">
          {[
            ["Chassi", "9BD27822AE7654321"],
            ["RENAVAM", "01234567890"],
            ["Processo", "0003456-78.2024.8.16.0190"],
            ["Origem", "DPRT - Maringá"],
            ["Entrada", "12/03/2026 09:42"],
            ["Vaga", "B-12-04"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono font-semibold">{v}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Histórico
          </h3>
          <div className="space-y-2">
            {[
              { t: "Apreensão registrada", d: "12/03 09:42", done: true },
              { t: "Vistoria realizada", d: "12/03 11:15", done: true },
              { t: "Autorização judicial", d: "28/04 14:00", done: true },
              { t: "Destruição agendada", d: "01/05 09:00", done: false },
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    s.done ? "bg-success/20 border border-success/40" : "bg-muted border border-border"
                  }`}
                >
                  {s.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 pb-2 border-b border-border/40">
                  <p className="text-sm">{s.t}</p>
                  <p className="text-[10px] text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-3 grid grid-cols-2 gap-2 border-t border-border">
        <Button variant="outline" onClick={() => go("checklist")} className="border-border">
          <ClipboardList className="h-4 w-4 mr-1" /> Checklist
        </Button>
        <Button
          onClick={() => go("destruicao")}
          className="bg-gradient-to-r from-destructive to-destructive/70 text-destructive-foreground"
        >
          <Flame className="h-4 w-4 mr-1" /> Destruir
        </Button>
      </div>
    </div>
  );
}

function EntradaScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => go("home")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">Nova entrada</p>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        <div className="rounded-xl bg-gradient-card border border-gold/30 p-4 text-center">
          <Truck className="h-8 w-8 text-gold mx-auto mb-2" />
          <p className="text-sm font-semibold">Registro de apreensão</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Preencha os dados e capture as fotos obrigatórias
          </p>
        </div>

        <div className="space-y-3">
          <Field label="Placa" value="ABC1D23" mono />
          <Field label="Chassi" value="9BD27822AE7654321" mono />
          <Field label="Marca / Modelo" value="Honda CG 160 Titan" />
          <Field label="Origem" value="Polícia Militar - 5º BPM" />
          <Field label="N° do BO" value="2026.000.123456" mono />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fotos obrigatórias (4 ângulos)
          </p>
          <div className="grid grid-cols-4 gap-2">
            {["Frente", "Trás", "Lado E", "Lado D"].map((p, i) => (
              <button
                key={p}
                className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 ${
                  i < 2
                    ? "bg-success/10 border-success/40 text-success"
                    : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                {i < 2 ? <Check className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                <span className="text-[9px]">{p}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-border">
        <Button
          onClick={() => go("vehicle")}
          className="w-full bg-gradient-gold text-primary-foreground font-semibold"
        >
          Confirmar entrada
        </Button>
      </div>
    </div>
  );
}

function ChecklistScreen({ go }: { go: (s: ScreenId) => void }) {
  const items = [
    { t: "Placa visível e legível", done: true },
    { t: "Chassi correspondente", done: true },
    { t: "Documentação anexada", done: true },
    { t: "Avarias fotografadas", done: false },
    { t: "Combustível verificado", done: false },
    { t: "Itens internos catalogados", done: false },
  ];
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => go("vehicle")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">Checklist de vistoria</p>
      </div>

      <div className="p-5 space-y-2 overflow-y-auto flex-1">
        <div className="rounded-lg bg-gold/10 border border-gold/30 p-3 mb-3">
          <p className="text-xs">
            <span className="font-bold text-gold">3 de 6</span> itens concluídos
          </p>
          <div className="h-1.5 mt-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-gold" />
          </div>
        </div>

        {items.map((it, i) => (
          <button
            key={i}
            className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left ${
              it.done ? "bg-success/10 border-success/30" : "bg-card border-border"
            }`}
          >
            <div
              className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${
                it.done ? "bg-success border-success" : "border-border"
              }`}
            >
              {it.done && <Check className="h-3 w-3 text-success-foreground" />}
            </div>
            <span className={`text-sm flex-1 ${it.done ? "line-through text-muted-foreground" : ""}`}>
              {it.t}
            </span>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="p-5 border-t border-border">
        <Button onClick={() => go("vehicle")} className="w-full bg-gradient-gold text-primary-foreground">
          Salvar checklist
        </Button>
      </div>
    </div>
  );
}

function DestruicaoScreen({ go }: { go: (s: ScreenId) => void }) {
  const steps = [
    { id: 1, label: "Foto do ANTES", done: true, icon: Camera },
    { id: 2, label: "Vídeo da operação", done: true, icon: Video },
    { id: 3, label: "Foto do DEPOIS", done: false, icon: Camera },
    { id: 4, label: "Gerar laudo", done: false, icon: FileCheck2 },
  ];
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => go("vehicle")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">Destruição controlada</p>
        <span className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold bg-destructive/20 text-destructive border border-destructive/40 animate-pulse">
          AO VIVO
        </span>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        <div className="rounded-xl bg-gradient-card border border-destructive/30 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/20 border border-destructive/40 flex items-center justify-center">
              <Flame className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-mono font-bold text-gold">ZXC7G89</p>
              <p className="text-[11px] text-muted-foreground">Fiat Strada • LD-2026-0287</p>
            </div>
          </div>

          <div className="space-y-2">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    s.done ? "bg-success/10 border-success/30" : "bg-muted/20 border-border"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${s.done ? "text-success" : "text-muted-foreground"}`}
                  />
                  <span className="text-sm flex-1">{s.label}</span>
                  {s.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Button variant="outline" className="w-full border-gold text-gold gap-2">
          <Camera className="h-4 w-4" /> Capturar foto DEPOIS
        </Button>

        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-[11px]">
          ⚠️ O botão de finalizar será liberado somente após todas as etapas obrigatórias.
        </div>
      </div>

      <div className="p-5 border-t border-border">
        <Button
          onClick={() => go("laudo")}
          className="w-full bg-gradient-to-r from-destructive to-destructive/70 text-destructive-foreground font-semibold"
        >
          <Flame className="h-4 w-4 mr-1" /> Finalizar e gerar laudo
        </Button>
      </div>
    </div>
  );
}

function LaudoScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => go("home")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">Laudo gerado</p>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        <div className="rounded-xl bg-gradient-card border border-success/40 p-5 text-center shadow-glow">
          <div className="h-14 w-14 rounded-full bg-success/20 border border-success/40 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <p className="font-bold text-lg">Destruição concluída</p>
          <p className="text-xs text-muted-foreground mt-1">
            Laudo emitido com validade jurídica
          </p>
          <p className="font-mono font-bold text-gold text-xl mt-4">LD-2026-0287</p>
        </div>

        <div className="rounded-lg bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="h-4 w-4 text-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              QR Code do vídeo
            </span>
          </div>
          <div className="aspect-square w-32 mx-auto bg-white rounded-md p-2 grid grid-cols-8 grid-rows-8 gap-px">
            {Array.from({ length: 64 }).map((_, i) => (
              <div
                key={i}
                className={(i * 13) % 3 === 0 ? "bg-black" : "bg-white"}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SHA-256
            </span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground break-all">
            a9f5c2e8b1d47632c0a81f9d6e3b5a274c9e0f1d8b6a3e5c2f7d9b0a1e4c6f8d
          </p>
        </div>
      </div>

      <div className="p-5 border-t border-border grid grid-cols-2 gap-2">
        <Button variant="outline" className="border-border">
          Compartilhar
        </Button>
        <Button onClick={() => go("home")} className="bg-gradient-gold text-primary-foreground">
          Concluir
        </Button>
      </div>
    </div>
  );
}

function PerfilScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="h-full flex flex-col bg-background pb-16">
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => go("home")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">Perfil</p>
      </div>

      <div className="p-5 text-center">
        <div className="h-20 w-20 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto">
          MA
        </div>
        <p className="mt-3 font-bold">Marcos Andrade</p>
        <p className="text-xs text-muted-foreground">Operador de pátio • OPR-2381</p>
        <Badge variant="outline" className="mt-2 border-gold-subtle text-gold">
          Pátio Central — Maringá
        </Badge>
      </div>

      <div className="px-5 grid grid-cols-3 gap-2 mb-4">
        {[
          { l: "Entradas", v: "184" },
          { l: "Vistorias", v: "97" },
          { l: "Destruições", v: "23" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-lg font-bold text-gold">{s.v}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="px-5 space-y-1">
        {[
          "Minhas operações",
          "Notificações",
          "Modo offline",
          "Suporte",
          "Sobre o app",
          "Sair",
        ].map((opt, i) => (
          <button
            key={opt}
            className={`w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card text-sm ${
              opt === "Sair" ? "text-destructive" : ""
            }`}
          >
            {opt}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <BottomNav active="perfil" go={go} />
    </div>
  );
}

/* ────────────────  Helpers  ──────────────── */

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      <div
        className={`rounded-md bg-muted/40 border border-border px-3 py-2 text-sm ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function BottomNav({ active, go }: { active: string; go: (s: ScreenId) => void }) {
  const items = [
    { id: "home" as ScreenId, label: "Início", icon: Home },
    { id: "scan" as ScreenId, label: "Scan", icon: ScanLine },
    { id: "entrada" as ScreenId, label: "Buscar", icon: Search },
    { id: "perfil" as ScreenId, label: "Perfil", icon: User },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur border-t border-border flex items-center justify-around">
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => go(it.id)}
            className={`flex flex-col items-center gap-0.5 ${
              isActive ? "text-gold" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
