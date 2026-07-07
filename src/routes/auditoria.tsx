import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Search, Loader2, Car, FileCheck2, Flame, RotateCcw, Camera, User } from "lucide-react";
import { canAccessAdminArea, getCurrentProfile } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auditoria")({
  beforeLoad: async () => {
    const profile = await getCurrentProfile();
    if (!profile) throw redirect({ to: "/login" });
    if (!canAccessAdminArea(profile.cargo)) throw redirect({ to: "/" });
  },
  component: AuditoriaPage,
  head: () => ({ meta: [{ title: "Auditoria — Pátio Legal" }] }),
});

const EVENT_ICONS: Record<string, any> = {
  entrada: Car, foto: Camera, laudo: FileCheck2, destruicao: Flame,
  restituicao: RotateCcw, sistema: ShieldCheck, decisao_judicial: FileCheck2,
  alocacao: Car, video: Camera,
};
const EVENT_COLORS: Record<string, string> = {
  entrada: "info", foto: "info", laudo: "gold", destruicao: "destructive",
  restituicao: "success", sistema: "muted", decisao_judicial: "warning",
  alocacao: "info", video: "info",
};

function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("historico")
      .select("*, veiculos(placa)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) setLogs(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !query ||
    (l.veiculos?.placa ?? "").toLowerCase().includes(query.toLowerCase()) ||
    l.titulo.toLowerCase().includes(query.toLowerCase()) ||
    (l.usuario_nome ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow="Trilha de auditoria"
        title="Logs do sistema"
        description="Registro contínuo: Quem, Quando e O Que alterou. Imutável e exportável para órgãos de controle."
      />

      <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-3 flex-wrap">
          <ShieldCheck className="h-4 w-4 text-gold" />
          <h3 className="font-semibold">Atividades registradas</h3>
          <div className="ml-auto relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, ação…"
              className="pl-10 bg-muted/40 h-8 text-sm"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} registros</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando logs…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 opacity-30" />
            <p className="font-medium">Nenhum registro encontrado</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((l) => {
              const Icon = EVENT_ICONS[l.tipo] ?? User;
              const color = EVENT_COLORS[l.tipo] ?? "muted";
              return (
                <li key={l.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-${color}/15 border border-${color}/30 shrink-0`}>
                    <Icon className={`h-4 w-4 text-${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {l.veiculos?.placa && (
                        <span className="font-mono font-semibold text-gold">{l.veiculos.placa} — </span>
                      )}
                      {l.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.usuario_nome && <span>{l.usuario_nome} • </span>}
                      {l.detalhe && <span>{l.detalhe} • </span>}
                      Módulo: {l.tipo}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString('pt-BR')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

