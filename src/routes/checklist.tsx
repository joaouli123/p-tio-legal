import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import checklistCarro from "@/assets/checklist-carro.png";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, ClipboardCheck, Loader2, Save, CheckSquare2, Printer } from "lucide-react";
import {
  getVeiculos, getChecklist, saveChecklist, getServicos,
  type Veiculo, type ChecklistRecepcao, type Servico,
} from "@/lib/db";
import { CHECKLIST_ITEMS, type ChecklistKey } from "@/lib/checklist-config";
import { supabase } from "@/lib/supabase";
import { printChecklist } from "@/lib/checklist-html";
import { withSignedPhotoUrls } from "@/lib/storage";

function parseChecklistSearch(search: Record<string, unknown>) {
  return {
    placa: typeof search.placa === "string" ? search.placa : "",
    veiculo: typeof search.veiculo === "string" ? search.veiculo : "",
  };
}

export const Route = createFileRoute("/checklist")({
  component: ChecklistPage,
  validateSearch: parseChecklistSearch,
  head: () => ({ meta: [{ title: "Checklist — Pátio Legal" }] }),
});

type FormState = Record<ChecklistKey, boolean> & { observacoes: string };

function emptyForm(): FormState {
  return {
    documentos_presentes: false, chaves_presentes: false, placa_identificavel: false,
    chassi_identificavel: false, vidros_intactos: false, pneus_presentes: false,
    motor_presente: false, bateria_presente: false, macaco_chave_roda: false,
    triangulo_presente: false, extintor_presente: false, observacoes: "",
  };
}

function fromChecklist(c: ChecklistRecepcao): FormState {
  return {
    documentos_presentes: c.documentos_presentes ?? false,
    chaves_presentes: c.chaves_presentes ?? false,
    placa_identificavel: c.placa_identificavel ?? false,
    chassi_identificavel: c.chassi_identificavel ?? false,
    vidros_intactos: c.vidros_intactos ?? false,
    pneus_presentes: c.pneus_presentes ?? false,
    motor_presente: c.motor_presente ?? false,
    bateria_presente: c.bateria_presente ?? false,
    macaco_chave_roda: c.macaco_chave_roda ?? false,
    triangulo_presente: c.triangulo_presente ?? false,
    extintor_presente: c.extintor_presente ?? false,
    observacoes: c.observacoes ?? "",
  };
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value && value.trim() ? value : "—"}</p>
    </div>
  );
}

const VEHICLE_TYPE_LABELS: Record<Veiculo["tipo"], string> = {
  automovel: "Automóvel",
  motocicleta: "Motocicleta",
  caminhao: "Caminhão",
  van_utilitario: "Van / Utilitário",
  onibus: "Ônibus",
  outro: "Outro",
};

const VEHICLE_CONDITION_LABELS: Record<Veiculo["situacao"], string> = {
  integro: "Íntegro",
  sinistrado: "Sinistrado",
  queimado: "Queimado",
  sucata: "Sucata",
  descaracterizado: "Descaracterizado",
};

function ChecklistPage() {
  const { placa: placaParam, veiculo: veiculoParam } = Route.useSearch();
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Veiculo | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [fotos, setFotos] = useState<{ url: string; label: string }[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  useEffect(() => {
    getVeiculos()
      .then(data => {
        setVeiculos(data);
        if (data.length) {
          if (veiculoParam) {
            const match = data.find(v => v.id === veiculoParam);
            setSelected(match ?? data[0]);
            if (match) setQuery(match.placa);
          } else if (placaParam) {
            const match = data.find(v => v.placa.toUpperCase() === placaParam.toUpperCase());
            setSelected(match ?? data[0]);
            if (match) setQuery(match.placa);
          } else {
            setSelected(data[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [placaParam, veiculoParam]);

  useEffect(() => {
    if (!selected) return;
    setSaved(false);
    setLoadingForm(true);
    getChecklist(selected.id)
      .then(c => setForm(c ? fromChecklist(c) : emptyForm()))
      .catch(console.error)
      .finally(() => setLoadingForm(false));
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) { setFotos([]); setServicos([]); return; }
    const FOTO_LABEL: Record<string, string> = {
      frente: "FRENTE",
      traseira: "TRASEIRA",
      lateral_esquerda: "LATERAL ESQUERDA",
      interior: "INTERIOR",
    };
    Promise.resolve(supabase
      .from("fotos")
      .select("tipo, storage_path, url")
      .eq("veiculo_id", selected.id))
      .then(async ({ data }) => {
        const photoRows = await withSignedPhotoUrls(data ?? []);
        setFotos(
          photoRows
            .filter((f: Record<string, unknown>) => !!f.url)
            .map((f: Record<string, unknown>) => ({
              url: f.url as string,
              label: FOTO_LABEL[f.tipo as string] ?? String(f.tipo ?? ""),
            }))
        );
      })
      .catch(() => setFotos([]));

    getServicos(selected.id)
      .then(data => setServicos(data))
      .catch(() => setServicos([]));
  }, [selected?.id]);

  const filtered = useMemo(() =>
    veiculos.filter(v => !query ||
      v.placa.toLowerCase().includes(query.toLowerCase()) ||
      v.marca_modelo.toLowerCase().includes(query.toLowerCase())),
    [veiculos, query]
  );

  const completedCount = CHECKLIST_ITEMS.filter(item => form[item.key]).length;

  const handlePrintChecklist = () => {
    if (!selected) return;
    printChecklist({ veiculo: selected, tipo: "entrada", ...form, fotos, servicos });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveChecklist({ veiculo_id: selected.id, ...form });
      setSaved(true);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Recebimento de veículos"
        title="Check List de Recebimento"
        description="Registre os itens presentes no veículo no momento do ingresso no pátio."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Vehicle list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar veículo…"
              className="pl-10 bg-muted/40"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /><span>Carregando…</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {filtered.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    selected?.id === v.id
                      ? "border-gold bg-gold/5 shadow-sm"
                      : "border-border hover:border-gold/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold tracking-wide text-sm">{v.placa}</span>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.marca_modelo}</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum veículo encontrado.</p>
              )}
            </div>
          )}
        </div>

        {/* Checklist form */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
              <ClipboardCheck className="h-10 w-10 opacity-20" />
              <p>Selecione um veículo</p>
            </div>
          ) : loadingForm ? (
            <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><span>Carregando checklist…</span>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selected.placa}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.marca_modelo}
                    {selected.cor ? ` · ${selected.cor}` : ""}
                    {selected.ano ? ` · ${selected.ano}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-medium">
                    {completedCount}/{CHECKLIST_ITEMS.length} itens
                  </span>
                  <Button variant="outline" onClick={() => void navigate({ to: "/veiculos/$id", params: { id: selected.id }, search: { status: "todos", q: "", openNew: false } })} className="gap-2 border-border">
                    Ver cadastro completo
                  </Button>
                  <Button variant="outline" onClick={handlePrintChecklist} className="gap-2 border-border">
                    <Printer className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saved ? "Salvo!" : "Salvar"}
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-gold h-1.5 rounded-full transition-all"
                  style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
                />
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(280px,0.9fr)]">
                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Identificação do veículo</h3>
                    <p className="text-xs text-muted-foreground">Os mesmos dados seguem para o checklist exportado.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailField label="Placa" value={selected.placa} />
                    <DetailField label="Tipo" value={VEHICLE_TYPE_LABELS[selected.tipo]} />
                    <DetailField label="Marca / Modelo" value={selected.marca_modelo} />
                    <DetailField label="Situação" value={VEHICLE_CONDITION_LABELS[selected.situacao]} />
                    <DetailField label="Cor" value={selected.cor} />
                    <DetailField label="Ano" value={selected.ano} />
                    <DetailField label="Chassi" value={selected.chassi} />
                    <DetailField label="Status no pátio" value={selected.status.replace(/_/g, " ")} />
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Dados da ocorrência</h3>
                    <p className="text-xs text-muted-foreground">Bloco espelhado com o relatório do checklist.</p>
                  </div>
                  <div className="grid gap-2">
                    <DetailField label="Delegacia" value={selected.delegacia_nome} />
                    <DetailField label="Processo / boletim" value={selected.processo} />
                    <DetailField label="Setor" value={selected.setor} />
                    <DetailField label="Local da remoção" value={selected.local_vaga} />
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Checklist visual</h3>
                    <p className="text-xs text-muted-foreground">Referência visual usada na tela e no PDF.</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-white p-3">
                    <img
                      src={checklistCarro}
                      alt="Vistas do veículo para conferência visual"
                      className="w-full h-auto max-h-80 object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Itens conferidos no recebimento</h3>
                  <p className="text-xs text-muted-foreground">A exportação em PDF usa exatamente esta mesma lista de conferência.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {CHECKLIST_ITEMS.map(item => (
                    <div
                      key={item.key}
                      onClick={() => setForm(f => ({ ...f, [item.key]: !f[item.key] }))}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all select-none ${
                        form[item.key]
                          ? "border-gold/60 bg-gold/5"
                          : "border-border/60 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        id={item.key}
                        checked={form[item.key]}
                        onCheckedChange={checked => setForm(f => ({ ...f, [item.key]: !!checked }))}
                        onClick={e => e.stopPropagation()}
                      />
                      <Label htmlFor={item.key} className="cursor-pointer text-sm leading-tight">{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Registre condições especiais, danos visíveis, peças faltando, avarias…"
                  className="resize-none"
                  rows={3}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                />
              </div>

              {saved && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckSquare2 className="h-4 w-4" />
                  Checklist salvo com sucesso!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
