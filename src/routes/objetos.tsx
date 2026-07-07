import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download, Search, MoreVertical, Eye, FileText, Camera, Loader2, MessageCircle, FilePenLine, Upload, ImagePlus, Boxes, Flame, Check, AlertTriangle } from "lucide-react";
import {
  getObjetos,
  createObjeto,
  createDestruicaoObjeto,
  updateObjeto,
  addHistoricoObjeto,
  type Objeto,
  type ObjetoStatus,
  type ObjetoTipo,
} from "@/lib/db";
import {
  buildLaudoObjetoDocument,
  buildListExportDocument,
  buildObjetoLaudoCanonicalContent,
  computeSha256Hex,
  downloadPdfDocument,
  downloadWordDocument,
  shareDocumentViaWhatsApp,
  type LaudoFoto,
} from "@/lib/document-utils";
import { supabase } from "@/lib/supabase";
import { prepareImageForUpload } from "@/lib/image-upload";

const OBJETO_ROUTE_FILTERS = ["todos", "apreendido", "em_analise", "aguardando", "destruido", "restituido"] as const;

type ObjetoRouteFilter = typeof OBJETO_ROUTE_FILTERS[number];

function parseObjetoSearch(search: Record<string, unknown>) {
  const status = typeof search.status === "string" && OBJETO_ROUTE_FILTERS.includes(search.status as ObjetoRouteFilter)
    ? (search.status as ObjetoRouteFilter)
    : "todos";

  const query = typeof search.q === "string" ? search.q : "";
  const openNew = search.openNew === true || search.openNew === "true" || search.openNew === "1";

  return { status, q: query, openNew };
}

export const Route = createFileRoute("/objetos")({
  validateSearch: parseObjetoSearch,
  component: ObjetosPage,
  head: () => ({ meta: [{ title: "Objetos — Pátio Legal" }] }),
});

const STATUS_FILTERS: { label: string; value: ObjetoStatus | 'todos' }[] = [
  { label: "Todos",        value: "todos" },
  { label: "Apreendidos",  value: "apreendido" },
  { label: "Em análise",   value: "em_analise" },
  { label: "Aguardando",   value: "aguardando" },
  { label: "Destruídos",   value: "destruido" },
  { label: "Restituídos",  value: "restituido" },
];

const TIPO_FILTERS: { label: string; value: ObjetoTipo | 'todos' }[] = [
  { label: "Todos os tipos", value: "todos" },
  { label: "Caça-níquel",    value: "caca_niquel" },
  { label: "Outro",          value: "outro" },
];

const TIPO_LABELS: Record<ObjetoTipo, string> = {
  caca_niquel: "Caça-níquel",
  outro: "Outro",
};

const OBJETO_STATUS_LABELS: Record<ObjetoStatus, string> = {
  apreendido: "Apreendido",
  em_analise: "Em análise",
  aguardando: "Aguardando",
  destruido: "Destruído",
  restituido: "Restituído",
};

const EXPORT_HEADERS = ["Descrição", "Tipo", "Marca / Modelo", "Nº de série", "Quantidade", "Delegacia", "Processo", "Status"];

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const EMPTY_FORM = {
  tipo: "caca_niquel" as ObjetoTipo,
  descricao: "",
  marca_modelo: "",
  numero_serie: "",
  quantidade: "1",
  unidade: "un",
  origem: "",
  situacao: "",
  status: "apreendido" as ObjetoStatus,
  delegacia_nome: "",
  processo: "",
  observacoes: "",
};

function NovoObjetoDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao.trim() || !form.delegacia_nome.trim() || !form.processo.trim()) {
      setError("Preencha os campos obrigatórios: Descrição, Delegacia e Processo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createObjeto({
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        marca_modelo: form.marca_modelo || undefined,
        numero_serie: form.numero_serie || undefined,
        quantidade: Math.max(1, parseInt(form.quantidade, 10) || 1),
        unidade: form.unidade || "un",
        origem: form.origem || undefined,
        situacao: form.situacao || undefined,
        status: form.status,
        delegacia_nome: form.delegacia_nome.trim(),
        processo: form.processo.trim(),
        observacoes: form.observacoes || undefined,
        registrado_por: user?.id,
      });
      setForm(EMPTY_FORM);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar objeto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-bold">Cadastrar novo objeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="space-y-4 overflow-y-auto px-6 py-2 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="caca_niquel">Máquina caça-níquel</SelectItem>
                  <SelectItem value="outro">Outro objeto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status inicial</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apreendido">Apreendido</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição <span className="text-destructive">*</span></Label>
            <Input value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Máquina caça-níquel modelo XYZ" className="bg-muted/40" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Marca / Modelo</Label>
              <Input value={form.marca_modelo} onChange={e => set("marca_modelo", e.target.value)} placeholder="Marca / modelo" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Nº de série</Label>
              <Input value={form.numero_serie} onChange={e => set("numero_serie", e.target.value.toUpperCase())} placeholder="SN123456" className="bg-muted/40 font-mono uppercase" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input type="number" min={1} value={form.quantidade} onChange={e => set("quantidade", e.target.value)} className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Input value={form.unidade} onChange={e => set("unidade", e.target.value)} placeholder="un" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Input value={form.origem} onChange={e => set("origem", e.target.value)} placeholder="Apreensão / operação" className="bg-muted/40" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Situação de chegada</Label>
            <Input value={form.situacao} onChange={e => set("situacao", e.target.value)} placeholder="Íntegro / danificado / lacrado…" className="bg-muted/40" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Delegacia de origem <span className="text-destructive">*</span></Label>
              <Input value={form.delegacia_nome} onChange={e => set("delegacia_nome", e.target.value)} placeholder="15ª SDP Maringá" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Número do processo <span className="text-destructive">*</span></Label>
              <Input value={form.processo} onChange={e => set("processo", e.target.value)} placeholder="0001234-56.2024.8.16.0190" className="bg-muted/40 font-mono" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Informações adicionais sobre o objeto..." className="bg-muted/40 resize-none" rows={3} />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          </div>
          <DialogFooter className="gap-2 px-6 py-4 border-t border-border bg-card shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="border-border">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Plus className="h-4 w-4" /> Cadastrar objeto</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type StepState = { done: boolean; fileName: string; publicUrl: string; storagePath: string };
const EMPTY_STEP: StepState = { done: false, fileName: "", publicUrl: "", storagePath: "" };

function DestruicaoObjetoDialog({ objeto, open, onClose, onFinalized }: { objeto: Objeto | null; open: boolean; onClose: () => void; onFinalized: () => void }) {
  const [metodo, setMetodo] = useState("Trituração");
  const [steps, setSteps] = useState({ foto_antes: EMPTY_STEP, foto_depois: EMPTY_STEP });
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [laudoNumber, setLaudoNumber] = useState("");
  const [oficioNumber, setOficioNumber] = useState("");
  const [processoNumber, setProcessoNumber] = useState("");
  const [laudoHash, setLaudoHash] = useState("");
  const inputRefs = useRef<Record<"foto_antes" | "foto_depois", HTMLInputElement | null>>({ foto_antes: null, foto_depois: null });

  const allDone = steps.foto_antes.done && steps.foto_depois.done;

  useEffect(() => {
    if (!open || !objeto) return;
    setMetodo("Trituração");
    setError("");
    setSuccess("");
    setLaudoNumber("");
    setOficioNumber("");
    setProcessoNumber(objeto.processo ?? "");
    setLaudoHash("");
    setSteps({ foto_antes: EMPTY_STEP, foto_depois: EMPTY_STEP });

    supabase
      .from("fotos")
      .select("tipo, storage_path, url")
      .eq("objeto_id", objeto.id)
      .then(({ data }) => {
        const next = { foto_antes: EMPTY_STEP, foto_depois: EMPTY_STEP };
        (data ?? []).forEach((item: any) => {
          if (item.tipo === "destruicao_antes") next.foto_antes = { done: true, fileName: item.storage_path?.split("/").pop() ?? "Arquivo enviado", publicUrl: item.url ?? "", storagePath: item.storage_path ?? "" };
          if (item.tipo === "destruicao_depois") next.foto_depois = { done: true, fileName: item.storage_path?.split("/").pop() ?? "Arquivo enviado", publicUrl: item.url ?? "", storagePath: item.storage_path ?? "" };
        });
        setSteps(next);
      });

    supabase
      .from("laudos")
      .select("numero, hash_sha256")
      .eq("objeto_id", objeto.id)
      .order("emitido_em", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const existing = data?.[0];
        if (existing?.numero) setLaudoNumber(existing.numero);
        if (existing?.hash_sha256) setLaudoHash(existing.hash_sha256);
      });
  }, [open, objeto]);

  const laudoDocument = useMemo(() => {
    if (!objeto) return null;
    const fotos: LaudoFoto[] = [];
    if (steps.foto_antes.publicUrl) fotos.push({ url: steps.foto_antes.publicUrl, label: "Objeto ANTES da destruição" });
    if (steps.foto_depois.publicUrl) fotos.push({ url: steps.foto_depois.publicUrl, label: "Objeto DEPOIS da destruição" });
    return buildLaudoObjetoDocument({
      objeto,
      laudoNumber: laudoNumber || "LD-—",
      metodo,
      destructionDate: new Date().toISOString(),
      oficioNumber: oficioNumber || undefined,
      processoNumber: processoNumber || undefined,
      fotos,
      hash: laudoHash || undefined,
    });
  }, [objeto, laudoNumber, metodo, oficioNumber, processoNumber, steps.foto_antes.publicUrl, steps.foto_depois.publicUrl, laudoHash]);

  const persistStepFile = async (stepId: "foto_antes" | "foto_depois", file: File) => {
    if (!objeto) return;
    const tipoMap = { foto_antes: "destruicao_antes", foto_depois: "destruicao_depois" } as const;
    setBusy(true);
    setError("");
    try {
      const prepared = await prepareImageForUpload(file);
      const safeName = prepared.filename.replace(/\s+/g, "-");
      const storagePath = `${objeto.id}/destruicao/${stepId}_${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("fotos-veiculos")
        .upload(storagePath, prepared.blob, { upsert: true, contentType: prepared.contentType });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("fotos-veiculos").getPublicUrl(storagePath);
      const { error: insertError } = await supabase.from("fotos").insert({
        objeto_id: objeto.id,
        storage_path: storagePath,
        url: publicData.publicUrl,
        tipo: tipoMap[stepId],
        label: file.name,
      });
      if (insertError) throw insertError;

      setSteps((current) => ({ ...current, [stepId]: { done: true, fileName: file.name, publicUrl: publicData.publicUrl, storagePath } }));
    } catch (uploadErr: any) {
      setError(uploadErr.message ?? "Não foi possível enviar o arquivo desta etapa.");
    } finally {
      setBusy(false);
    }
  };

  const handleInputChange = async (stepId: "foto_antes" | "foto_depois", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await persistStepFile(stepId, file);
    event.target.value = "";
  };

  const handleFinalizar = async () => {
    if (!objeto || !allDone) return;
    setSaving(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const finalizadoEm = new Date().toISOString();

      const { data: existingDestruicao } = await supabase
        .from("destruicoes")
        .select("id")
        .eq("objeto_id", objeto.id)
        .maybeSingle();

      let destruicaoId = existingDestruicao?.id;

      if (destruicaoId) {
        const { error: updateError } = await supabase
          .from("destruicoes")
          .update({ metodo, operador_nome: user?.email ?? "Operador", finalizado: true, finalizado_em: finalizadoEm })
          .eq("id", destruicaoId);
        if (updateError) throw updateError;
      } else {
        const created = await createDestruicaoObjeto(objeto.id, {
          metodo,
          operador_nome: user?.email ?? "Operador",
          finalizado: true,
          finalizado_em: finalizadoEm,
        });
        destruicaoId = created.id;
      }

      await updateObjeto(objeto.id, { status: "destruido" });

      const { data: existingLaudo } = await supabase
        .from("laudos")
        .select("id, numero")
        .eq("objeto_id", objeto.id)
        .maybeSingle();

      if (existingLaudo?.numero) {
        setLaudoNumber(existingLaudo.numero);
      } else {
        // Reserve the sequential laudo number first so the SHA-256 hash covers
        // the exact emitted numero, then insert the laudo with number + hash.
        const { data: numero, error: numeroError } = await supabase.rpc("proximo_numero_laudo");
        if (numeroError) throw numeroError;
        const finalLaudoNumber = numero as string;
        const canonical = buildObjetoLaudoCanonicalContent({
          laudoNumber: finalLaudoNumber,
          objeto,
          metodo,
          destructionMoment: finalizadoEm,
          oficio: oficioNumber || "",
          processo: processoNumber || objeto.processo || "",
        });
        const hash = await computeSha256Hex(canonical);
        const { data: laudoRow, error: laudoError } = await supabase
          .from("laudos")
          .insert({
            numero: finalLaudoNumber,
            objeto_id: objeto.id,
            destruicao_id: destruicaoId,
            responsavel_nome: user?.email ?? "Operador",
            emitido_em: finalizadoEm,
            hash_sha256: hash,
          })
          .select()
          .single();
        if (laudoError) throw laudoError;
        setLaudoNumber((laudoRow as { numero: string }).numero);
        setLaudoHash(hash);
      }

      await addHistoricoObjeto({
        objeto_id: objeto.id,
        tipo: "sistema",
        titulo: "Destruição finalizada",
        detalhe: `Método: ${metodo}`,
        usuario_nome: user?.email ?? "Sistema",
      });

      setSuccess(`Destruição de "${objeto.descricao}" finalizada com sucesso!`);
      onFinalized();
    } catch (err: any) {
      setError(err.message ?? "Erro ao finalizar destruição.");
    } finally {
      setSaving(false);
    }
  };

  const stepList = [
    { id: "foto_antes" as const, label: "Foto do ANTES", done: steps.foto_antes.done, helper: steps.foto_antes.fileName },
    { id: "foto_depois" as const, label: "Foto do DEPOIS", done: steps.foto_depois.done, helper: steps.foto_depois.fileName },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Destruição de objeto</DialogTitle>
        </DialogHeader>

        {objeto && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/20 border border-border p-3 text-sm">
              <span className="text-gold font-semibold">{objeto.descricao}</span>
              {objeto.marca_modelo && <> • {objeto.marca_modelo}</>}
              {objeto.numero_serie && <span className="text-muted-foreground"> • SN <span className="font-mono">{objeto.numero_serie}</span></span>}
              {objeto.processo && <span className="text-muted-foreground"> • Proc. <span className="font-mono">{objeto.processo}</span></span>}
            </div>

            {success && (
              <div className="rounded-xl bg-success/10 border border-success/30 p-3 text-success text-sm font-medium">✓ {success}</div>
            )}

            <div className="space-y-1 max-w-xs">
              <Label>Método de destruição</Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trituração">Trituração</SelectItem>
                  <SelectItem value="Prensagem">Prensagem</SelectItem>
                  <SelectItem value="Corte">Corte</SelectItem>
                  <SelectItem value="Incineração">Incineração</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stepList.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => inputRefs.current[s.id]?.click()}
                  className={`rounded-lg border p-4 transition-all cursor-pointer hover:border-gold/50 ${s.done ? "bg-success/10 border-success/30" : "bg-muted/20 border-border"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Camera className={`h-5 w-5 ${s.done ? "text-success" : "text-muted-foreground"}`} />
                    {s.done ? <Check className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Etapa {i + 1}</p>
                  <p className="font-semibold text-sm">{s.label}</p>
                  {!s.done && <p className="text-[10px] text-gold mt-1">Clique para selecionar o arquivo</p>}
                  {s.helper && <p className="text-[10px] text-muted-foreground mt-1 break-all">{s.helper}</p>}
                </div>
              ))}
            </div>

            <div className="hidden">
              <input ref={(node) => { inputRefs.current.foto_antes = node; }} type="file" accept="image/*" capture="environment" onChange={(event) => void handleInputChange("foto_antes", event)} />
              <input ref={(node) => { inputRefs.current.foto_depois = node; }} type="file" accept="image/*" capture="environment" onChange={(event) => void handleInputChange("foto_depois", event)} />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleFinalizar}
                disabled={!allDone || saving || busy}
                className={`gap-2 ${allDone ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "opacity-50 cursor-not-allowed bg-muted"}`}
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Finalizando…</> : <><Flame className="h-4 w-4" /> Finalizar destruição</>}
              </Button>
              <p className="text-xs text-muted-foreground self-center">
                {!allDone ? "⚠️ Registre as fotos antes e depois." : "✓ Pronto para finalizar."}
              </p>
            </div>

            {laudoDocument && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Laudo de destruição</p>
                  <p className="text-xs text-muted-foreground">Ajuste os dados variáveis antes de gerar Word, PDF ou enviar no WhatsApp.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="obj-laudo-number">Nº do laudo</Label>
                    <Input id="obj-laudo-number" value={laudoNumber} onChange={(event) => setLaudoNumber(event.target.value)} placeholder="Gerado ao finalizar" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="obj-oficio-number">Ofício requisitante</Label>
                    <Input id="obj-oficio-number" value={oficioNumber} onChange={(event) => setOficioNumber(event.target.value)} placeholder="Informe o ofício requisitante" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="obj-processo-number">Processo / Inquérito</Label>
                  <Input id="obj-processo-number" value={processoNumber} onChange={(event) => setProcessoNumber(event.target.value)} placeholder="Informe o processo ou inquérito" />
                </div>
                <DocumentPreview document={laudoDocument} />
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button type="button" variant="outline" className="gap-2 border-border" onClick={() => void downloadWordDocument(laudoDocument)}>
                    <FilePenLine className="h-4 w-4" /> Word editável
                  </Button>
                  <Button type="button" variant="outline" className="gap-2 border-border" onClick={() => void downloadPdfDocument(laudoDocument)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button type="button" className="gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]" onClick={() => void shareDocumentViaWhatsApp(laudoDocument, "pdf")}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ObjetosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [objetos, setObjetos] = useState<Objeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(search.q);
  const [filter, setFilter] = useState<ObjetoStatus | 'todos'>(search.status);
  const [tipoFilter, setTipoFilter] = useState<ObjetoTipo | 'todos'>("todos");
  const [showForm, setShowForm] = useState(search.openNew);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photoTarget, setPhotoTarget] = useState<Objeto | null>(null);
  const [uploadingObjetoId, setUploadingObjetoId] = useState<string | null>(null);
  const [destruicaoTarget, setDestruicaoTarget] = useState<Objeto | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setFilter(search.status); }, [search.status]);
  useEffect(() => { setQuery(search.q); }, [search.q]);
  useEffect(() => { setShowForm(search.openNew); }, [search.openNew]);

  const load = () => {
    setLoading(true);
    getObjetos(filter === 'todos' ? undefined : filter)
      .then(setObjetos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const updateRouteSearch = (nextSearch: Partial<{ status: ObjetoRouteFilter; q: string; openNew: boolean }>) => {
    void navigate({
      to: "/objetos",
      replace: true,
      search: (prev) => {
        const mergedStatus = nextSearch.status ?? prev.status ?? "todos";
        const mergedQuery = nextSearch.q ?? prev.q ?? "";
        const mergedOpenNew = nextSearch.openNew ?? prev.openNew ?? false;
        return {
          status: mergedStatus === "todos" ? undefined : mergedStatus,
          q: mergedQuery || undefined,
          openNew: mergedOpenNew || undefined,
        };
      },
    });
  };

  const handleFilterChange = (nextFilter: ObjetoStatus | 'todos') => {
    setFilter(nextFilter);
    updateRouteSearch({ status: nextFilter });
  };

  const handleNewOpen = () => { setShowForm(true); updateRouteSearch({ openNew: true }); };
  const handleNewClose = () => { setShowForm(false); updateRouteSearch({ openNew: false }); };

  const startPhotoUpload = (objeto: Objeto, mode: 'camera' | 'gallery') => {
    setPhotoTarget(objeto);
    if (mode === 'camera') captureInputRef.current?.click();
    else galleryInputRef.current?.click();
  };

  const handlePhotoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !photoTarget) return;

    setUploadingObjetoId(photoTarget.id);
    setNotice(null);
    try {
      const prepared = await prepareImageForUpload(file);
      const storagePath = `${photoTarget.id}/chegada_${Date.now()}_${prepared.filename.replace(/\s+/g, '-')}`;
      const { error: uploadError } = await supabase.storage
        .from('fotos-veiculos')
        .upload(storagePath, prepared.blob, { upsert: true, contentType: prepared.contentType });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('fotos-veiculos').getPublicUrl(storagePath);
      const { error: insertError } = await supabase.from('fotos').insert({
        objeto_id: photoTarget.id,
        storage_path: storagePath,
        url: publicData.publicUrl,
        tipo: 'chegada',
        label: file.name,
      });
      if (insertError) throw insertError;

      setNotice({ type: 'success', text: `Foto registrada para "${photoTarget.descricao}".` });
    } catch (uploadErr: any) {
      setNotice({ type: 'error', text: uploadErr.message ?? 'Não foi possível enviar a foto.' });
    } finally {
      setUploadingObjetoId(null);
      setPhotoTarget(null);
      event.target.value = '';
    }
  };

  const filtered = objetos.filter(o =>
    (tipoFilter === 'todos' || o.tipo === tipoFilter) &&
    (!query ||
      o.descricao.toLowerCase().includes(query.toLowerCase()) ||
      (o.marca_modelo ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (o.numero_serie ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (o.processo ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (o.delegacia_nome ?? '').toLowerCase().includes(query.toLowerCase()))
  );

  const activeFilterLabel = STATUS_FILTERS.find((item) => item.value === filter)?.label ?? "Todos";
  const listDocument = useMemo(() => buildListExportDocument({
    title: "LISTAGEM COMPLETA DE OBJETOS APREENDIDOS",
    subtitle: "Pátio Legal Maringá SAT • Exportação integral do cadastro de objetos",
    filenameLabel: `objetos-${filter}${query ? `-${query}` : ""}`,
    meta: [
      { label: "Filtro aplicado", value: activeFilterLabel },
      { label: "Busca", value: query.trim() || "Sem termo de busca" },
      { label: "Origens únicas", value: String(new Set(filtered.map((o) => o.delegacia_nome ?? "—")).size) },
    ],
    paragraphs: [
      `Esta exportação reúne a lista completa de ${filtered.length} objeto(s) exibidos atualmente na tela de cadastro de bens apreendidos.`,
      `Filtro aplicado: ${activeFilterLabel}.${query.trim() ? ` Busca atual: ${query.trim()}.` : ""}`,
    ],
    headers: EXPORT_HEADERS,
    rows: filtered.map((o) => [
      o.descricao,
      TIPO_LABELS[o.tipo],
      o.marca_modelo ?? "—",
      o.numero_serie ?? "—",
      `${o.quantidade} ${o.unidade}`,
      o.delegacia_nome ?? "—",
      o.processo ?? "—",
      OBJETO_STATUS_LABELS[o.status],
    ]),
  }), [activeFilterLabel, filter, filtered, query]);

  return (
    <>
      <NovoObjetoDialog open={showForm} onClose={handleNewClose} onSaved={load} />
      <DestruicaoObjetoDialog objeto={destruicaoTarget} open={!!destruicaoTarget} onClose={() => setDestruicaoTarget(null)} onFinalized={load} />
      <PageHeader
        eyebrow="Cadastro de bens apreendidos"
        title="Objetos"
        description="Máquinas caça-níquel e demais objetos apreendidos, com o mesmo fluxo de destruição e laudo dos veículos."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-border" disabled={filtered.length === 0}>
                  <Download className="h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lista completa da tela ({filtered.length})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void downloadPdfDocument(listDocument)}>
                  <FileText className="h-4 w-4" /> Exportar lista completa em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void downloadWordDocument(listDocument)}>
                  <FilePenLine className="h-4 w-4" /> Exportar lista completa em Word
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(listDocument, "pdf")}>
                  <MessageCircle className="h-4 w-4" /> Enviar lista completa em PDF por WhatsApp
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleNewOpen} className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              <Plus className="h-4 w-4" /> Novo objeto
            </Button>
          </>
        }
      />

      <div className="hidden">
        <input ref={captureInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void handlePhotoFile(event)} />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={(event) => void handlePhotoFile(event)} />
      </div>

      {notice && (
        <div className={`rounded-xl border p-4 text-sm font-medium ${notice.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
          {notice.text}
        </div>
      )}

      <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, marca, nº de série…"
              className="pl-10 bg-muted/40"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as ObjetoTipo | 'todos')}>
            <SelectTrigger className="w-44 bg-muted/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPO_FILTERS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1 text-xs">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  filter === f.value
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando objetos…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Boxes className="h-12 w-12 opacity-30" />
              <p className="font-medium">Nenhum objeto encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou a busca</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground bg-muted/20 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Nº de série</th>
                  <th className="px-5 py-3 font-medium">Qtd.</th>
                  <th className="px-5 py-3 font-medium">Origem</th>
                  <th className="px-5 py-3 font-medium">Entrada</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium">{o.descricao}</p>
                      {o.marca_modelo && <p className="text-xs text-muted-foreground">{o.marca_modelo}</p>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{TIPO_LABELS[o.tipo]}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{o.numero_serie ?? '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.quantidade} {o.unidade}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.delegacia_nome ?? '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmt(o.created_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status as any} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" title="Ver detalhes" onClick={() => navigate({ to: "/objetos/$id", params: { id: o.id } })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" title="Fotos" disabled={uploadingObjetoId === o.id}>
                              {uploadingObjetoId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startPhotoUpload(o, 'camera')}>
                              <Camera className="h-4 w-4" /> Tirar foto agora
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startPhotoUpload(o, 'gallery')}>
                              <ImagePlus className="h-4 w-4" /> Escolher arquivo / galeria
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate({ to: "/objetos/$id", params: { id: o.id } })}>
                              <Upload className="h-4 w-4" /> Abrir ficha do objeto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Destruição / laudo" onClick={() => setDestruicaoTarget(o)}>
                          <Flame className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" title="Mais opções">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDestruicaoTarget(o)}>
                              <Flame className="h-4 w-4" /> Registrar destruição / laudo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate({ to: "/objetos/$id", params: { id: o.id } })}>
                              <Eye className="h-4 w-4" /> Ver detalhes completos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando {filtered.length} de {objetos.length} objetos</span>
        </div>
      </div>
    </>
  );
}
