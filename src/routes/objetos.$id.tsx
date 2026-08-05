import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Objeto>>({});

  useEffect(() => {
    Promise.all([getObjeto(id), getHistoricoObjeto(id)])
      .then(([o, h]) => { setObjeto(o); setNewStatus(o.status); setDraft(o); setHistorico(h); })
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

  const updateDraft = <K extends keyof Objeto>(key: K, value: Objeto[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSaveDetails = async () => {
    if (!objeto) return;
    setSaving(true);
    try {
      const updated = await updateObjeto(id, {
        tipo: (draft.tipo ?? objeto.tipo) as Objeto["tipo"],
        descricao: draft.descricao?.trim() || objeto.descricao,
        marca_modelo: draft.marca_modelo?.trim() || undefined,
        numero_serie: draft.numero_serie?.trim() || undefined,
        quantidade: Number(draft.quantidade) > 0 ? Number(draft.quantidade) : objeto.quantidade,
        unidade: draft.unidade?.trim() || objeto.unidade,
        origem: draft.origem?.trim() || undefined,
        situacao: draft.situacao?.trim() || undefined,
        status: (draft.status ?? objeto.status) as ObjetoStatus,
        delegacia_nome: draft.delegacia_nome?.trim() || undefined,
        processo: draft.processo?.trim() || undefined,
        setor: draft.setor?.trim() || undefined,
        local_vaga: draft.local_vaga?.trim() || undefined,
        observacoes: draft.observacoes?.trim() || undefined,
      });
      const { data: { user } } = await supabase.auth.getUser();
      await addHistoricoObjeto({
        objeto_id: id,
        tipo: "sistema",
        titulo: "Cadastro do objeto atualizado",
        detalhe: `Descrição: ${updated.descricao}; status: ${objeto.status} → ${updated.status}`,
        usuario_nome: user?.email ?? "Sistema",
      });
      setObjeto(updated);
      setDraft(updated);
      setNewStatus(updated.status);
      setHistorico(await getHistoricoObjeto(id));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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
        <Button variant="outline" onClick={() => navigate({ to: "/objetos", search: { status: "todos", q: "", openNew: false } })}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/objetos", search: { status: "todos", q: "", openNew: false } })} className="gap-2 text-muted-foreground hover:text-foreground">
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
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-lg">Cadastro completo</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => { setEditing((value) => !value); setDraft(objeto); }}>
                  {editing ? "Cancelar" : "Editar cadastro"}
                </Button>
              </div>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Descrição</Label><Input value={draft.descricao ?? ""} onChange={(event) => updateDraft("descricao", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Tipo</Label><Select value={draft.tipo ?? objeto.tipo} onValueChange={(value) => updateDraft("tipo", value as Objeto["tipo"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="caca_niquel">Máquina caça-níquel</SelectItem><SelectItem value="outro">Outro objeto</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label>Marca / Modelo</Label><Input value={draft.marca_modelo ?? ""} onChange={(event) => updateDraft("marca_modelo", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Nº de série</Label><Input value={draft.numero_serie ?? ""} onChange={(event) => updateDraft("numero_serie", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min="1" value={draft.quantidade ?? 1} onChange={(event) => updateDraft("quantidade", Number(event.target.value))} /></div>
                    <div className="space-y-1"><Label>Unidade</Label><Input value={draft.unidade ?? "unidade"} onChange={(event) => updateDraft("unidade", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Origem</Label><Input value={draft.origem ?? ""} onChange={(event) => updateDraft("origem", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Situação</Label><Input value={draft.situacao ?? ""} onChange={(event) => updateDraft("situacao", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Status</Label><Select value={draft.status ?? objeto.status} onValueChange={(value) => updateDraft("status", value as ObjetoStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apreendido">Apreendido</SelectItem><SelectItem value="em_analise">Em análise</SelectItem><SelectItem value="aguardando">Aguardando</SelectItem><SelectItem value="destruido">Destruído</SelectItem><SelectItem value="restituido">Restituído</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label>Delegacia de origem</Label><Input value={draft.delegacia_nome ?? ""} onChange={(event) => updateDraft("delegacia_nome", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Processo / Inquérito</Label><Input value={draft.processo ?? ""} onChange={(event) => updateDraft("processo", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Setor</Label><Input value={draft.setor ?? ""} onChange={(event) => updateDraft("setor", event.target.value)} /></div>
                    <div className="space-y-1"><Label>Vaga / local</Label><Input value={draft.local_vaga ?? ""} onChange={(event) => updateDraft("local_vaga", event.target.value)} /></div>
                  </div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea rows={3} value={draft.observacoes ?? ""} onChange={(event) => updateDraft("observacoes", event.target.value)} /></div>
                  <Button type="button" onClick={() => void handleSaveDetails()} disabled={saving} className="w-full gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> : <><Save className="h-4 w-4" /> Salvar cadastro completo</>}
                  </Button>
                </div>
              ) : (
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
              )}
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
