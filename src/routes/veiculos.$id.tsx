import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PlateStatusBadge } from "@/components/PlateStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Car, FileText, Clock, Loader2, Save } from "lucide-react";
import { getVeiculo, getHistorico, updateVeiculo, addHistorico, type Veiculo, type HistoricoItem } from "@/lib/db";
import { resolvePlateStatus } from "@/lib/plate-status";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/veiculos/$id")({
  component: VeiculoDetailPage,
  head: () => ({ meta: [{ title: "Detalhe do Veículo — Pátio Legal" }] }),
});

function VeiculoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getVeiculo(id), getHistorico(id)])
      .then(([v, h]) => { setVeiculo(v); setNewStatus(v.status); setHistorico(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveStatus = async () => {
    if (!veiculo || newStatus === veiculo.status) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updated = await updateVeiculo(id, { status: newStatus as any });
      await addHistorico({
        veiculo_id: id,
        tipo: "sistema",
        titulo: `Status alterado para "${newStatus}"`,
        detalhe: `Anterior: ${veiculo.status}`,
        usuario_nome: user?.email ?? "Sistema",
      });
      setVeiculo(updated);
      const h = await getHistorico(id);
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
        <span>Carregando veículo…</span>
      </div>
    );
  }

  if (!veiculo) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
        <Car className="h-16 w-16 opacity-30" />
        <p className="font-medium text-lg">Veículo não encontrado</p>
        <Button variant="outline" onClick={() => navigate({ to: "/veiculos" })}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const plateStatus = resolvePlateStatus(veiculo);
  const hasOfficialLookup = !!(veiculo.marca_modelo_consulta || veiculo.ano_consulta || veiculo.cor_consulta || veiculo.tipo_consulta);

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/veiculos" })} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Veículos
        </Button>
      </div>

      <PageHeader
        eyebrow={`Placa ostentada ${veiculo.placa}`}
        title={veiculo.marca_modelo}
        description={[veiculo.ano, veiculo.cor, veiculo.delegacia_nome].filter(Boolean).join(" • ")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PlateStatusBadge status={plateStatus} />
            <StatusBadge status={veiculo.status as any} />
          </div>
        }
      />

      <Tabs defaultValue="dados">
        <TabsList className="bg-muted/40 border border-border">
          <TabsTrigger value="dados" className="gap-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground">
            <Car className="h-4 w-4" /> Dados
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
              {plateStatus !== 'regular' && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  Cadastro com placa ostentada divergente da referência oficial. Mantenha o veículo em análise até concluir a validação física e documental.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { l: "Placa ostentada", v: veiculo.placa, mono: true },
                  { l: "Placa oficial / real", v: veiculo.placa_oficial ?? veiculo.placa ?? "—", mono: true },
                  { l: "Status da placa", v: plateStatus.replace(/_/g, ' ') },
                  { l: "Chassi", v: veiculo.chassi ?? "—", mono: true },
                  { l: "Marca / Modelo", v: veiculo.marca_modelo },
                  { l: "Ano", v: veiculo.ano ?? "—" },
                  { l: "Cor", v: veiculo.cor ?? "—" },
                  { l: "Tipo", v: veiculo.tipo },
                  { l: "Situação", v: veiculo.situacao },
                  { l: "Vaga", v: veiculo.local_vaga ?? "—", mono: true },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-xs text-muted-foreground mb-0.5">{f.l}</p>
                    <p className={`font-medium ${f.mono ? "font-mono" : ""}`}>{f.v}</p>
                  </div>
                ))}
              </div>
              {hasOfficialLookup && (
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Referência oficial da consulta</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Marca / Modelo oficial</p>
                      <p className="font-medium">{veiculo.marca_modelo_consulta ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Ano oficial</p>
                      <p className="font-medium">{veiculo.ano_consulta ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Cor oficial</p>
                      <p className="font-medium">{veiculo.cor_consulta ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Tipo oficial</p>
                      <p className="font-medium">{veiculo.tipo_consulta ?? '—'}</p>
                    </div>
                  </div>
                </div>
              )}
              {veiculo.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-muted-foreground">{veiculo.observacoes}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
              <h3 className="font-semibold text-lg">Alterar status</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Status atual</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_patio">No pátio</SelectItem>
                      <SelectItem value="em_analise">Em análise</SelectItem>
                      <SelectItem value="destruido">Destruído</SelectItem>
                      <SelectItem value="restituido">Restituído</SelectItem>
                      <SelectItem value="leilao">Leilão</SelectItem>
                      <SelectItem value="doacao">Destinação</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSaveStatus}
                  disabled={saving || newStatus === veiculo.status}
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
                  <p className="font-medium">{new Date(veiculo.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última atualização</p>
                  <p className="font-medium">{new Date(veiculo.updated_at).toLocaleString('pt-BR')}</p>
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
                <p className="font-mono font-bold text-gold text-base">{veiculo.processo ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Delegacia de origem</p>
                <p className="font-semibold">{veiculo.delegacia_nome ?? "—"}</p>
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
