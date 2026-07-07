import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Boxes, FileText, Clock, Loader2, Save } from "lucide-react";
import {
  getObjeto,
  getHistoricoObjeto,
  updateObjeto,
  addHistoricoObjeto,
  type Objeto,
  type ObjetoStatus,
  type HistoricoItem,
} from "@/lib/db";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/objetos/$id")({
  component: ObjetoDetailPage,
  head: () => ({ meta: [{ title: "Detalhe do Objeto — Pátio Legal" }] }),
});

const TIPO_LABELS: Record<string, string> = {
  caca_niquel: "Máquina caça-níquel",
  outro: "Outro objeto",
};

function ObjetoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [objeto, setObjeto] = useState<Objeto | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState<ObjetoStatus | "">("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getObjeto(id), getHistoricoObjeto(id)])
      .then(([o, h]) => { setObjeto(o); setNewStatus(o.status); setHistorico(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveStatus = async () => {
    if (!objeto || !newStatus || newStatus === objeto.status) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updated = await updateObjeto(id, { status: newStatus });
      await addHistoricoObjeto({
        objeto_id: id,
        tipo: "sistema",
        titulo: `Status alterado para "${newStatus}"`,
        detalhe: `Anterior: ${objeto.status}`,
        usuario_nome: user?.email ?? "Sistema",
      });
      setObjeto(updated);
      const h = await getHistoricoObjeto(id);
      setHistorico(h);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Carregando objeto…</span>
      </div>
    );
  }

  if (!objeto) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
        <Boxes className="h-16 w-16 opacity-30" />
        <p className="font-medium text-lg">Objeto não encontrado</p>
        <Button variant="outline" onClick={() => navigate({ to: "/objetos" })}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/objetos" })} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Objetos
        </Button>
      </div>

      <PageHeader
        eyebrow={TIPO_LABELS[objeto.tipo] ?? "Objeto apreendido"}
        title={objeto.descricao}
        description={[objeto.marca_modelo, objeto.numero_serie, objeto.delegacia_nome].filter(Boolean).join(" • ")}
        actions={<StatusBadge status={objeto.status as any} />}
      />

      <Tabs defaultValue="dados">
        <TabsList className="bg-muted/40 border border-border">
          <TabsTrigger value="dados" className="gap-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground">
            <Boxes className="h-4 w-4" /> Dados
          </TabsTrigger>
          <TabsTrigger value="processo" className="gap-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4" /> Processo
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground">
            <Clock className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
              <h3 className="font-semibold text-lg">Identificação</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { l: "Descrição", v: objeto.descricao },
                  { l: "Tipo", v: TIPO_LABELS[objeto.tipo] ?? objeto.tipo },
                  { l: "Marca / Modelo", v: objeto.marca_modelo ?? "—" },
                  { l: "Nº de série", v: objeto.numero_serie ?? "—", mono: true },
                  { l: "Quantidade", v: `${objeto.quantidade} ${objeto.unidade}` },
                  { l: "Origem", v: objeto.origem ?? "—" },
                  { l: "Situação", v: objeto.situacao ?? "—" },
                  { l: "Vaga / local", v: objeto.local_vaga ?? "—", mono: true },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-xs text-muted-foreground mb-0.5">{f.l}</p>
                    <p className={`font-medium ${f.mono ? "font-mono" : ""}`}>{f.v}</p>
                  </div>
                ))}
              </div>
              {objeto.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-muted-foreground">{objeto.observacoes}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
              <h3 className="font-semibold text-lg">Alterar status</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Status atual</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ObjetoStatus)}>
                    <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apreendido">Apreendido</SelectItem>
                      <SelectItem value="em_analise">Em análise</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="destruido">Destruído</SelectItem>
                      <SelectItem value="restituido">Restituído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSaveStatus}
                  disabled={saving || newStatus === objeto.status}
                  className="w-full gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold"
                >
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> :
                   saved ? "✓ Salvo!" :
                   <><Save className="h-4 w-4" /> Salvar alteração</>}
                </Button>
              </div>
              <div className="pt-4 border-t border-border space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Entrada no sistema</p>
                  <p className="font-medium">{new Date(objeto.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última atualização</p>
                  <p className="font-medium">{new Date(objeto.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="processo" className="mt-4">
          <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
            <h3 className="font-semibold text-lg">Informações processuais</h3>
            <div className="grid sm:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Número do processo</p>
                <p className="font-mono font-bold text-gold text-base">{objeto.processo ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Delegacia de origem</p>
                <p className="font-semibold">{objeto.delegacia_nome ?? "—"}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold text-lg">Histórico de eventos</h3>
              <p className="text-xs text-muted-foreground">{historico.length} registro(s)</p>
            </div>
            {historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Clock className="h-12 w-12 opacity-30" />
                <p className="font-medium">Nenhum evento registrado</p>
              </div>
            ) : (
              <ol className="relative border-l border-gold/30 ml-8 my-6 space-y-6 mr-6">
                {historico.map((h) => (
                  <li key={h.id} className="ml-5">
                    <span className="absolute -left-1.75 h-3 w-3 rounded-full bg-gold border-2 border-sidebar" />
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</p>
                    <p className="font-semibold text-sm">{h.titulo}</p>
                    {h.detalhe && <p className="text-xs text-muted-foreground">{h.detalhe}</p>}
                    {h.usuario_nome && <p className="text-xs text-muted-foreground">Por: {h.usuario_nome}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
