import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Camera, Check, AlertTriangle, Flame, FileCheck2, QrCode, Hash, Loader2, Plus, Download, MessageCircle, FilePenLine, ExternalLink, Save } from "lucide-react";
import { getVeiculos, getDestruicoes, createDestruicao, createLaudo, updateVeiculo, type Veiculo } from "@/lib/db";
import { buildLaudoDocument, buildVeiculoLaudoCanonicalContent, computeSha256Hex, downloadPdfDocument, downloadWordDocument, shareDocumentViaWhatsApp, type LaudoFoto } from "@/lib/document-utils";
import { supabase } from "@/lib/supabase";
import { prepareImageForUpload } from "@/lib/image-upload";
import { getSignedPhotoUrl, withSignedPhotoUrls } from "@/lib/storage";

export const Route = createFileRoute("/destruicao")({
  component: DestruicaoPage,
  head: () => ({ meta: [{ title: "Destruição — Pátio Legal" }] }),
});

function DestruicaoPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [destruicoes, setDestruicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [metodo, setMetodo] = useState("Trituração");
  const [steps, setSteps] = useState({
    foto_antes: { done: false, fileName: "", publicUrl: "", storagePath: "" },
    foto_depois: { done: false, fileName: "", publicUrl: "", storagePath: "" },
  });
  const [reportPhotos, setReportPhotos] = useState<LaudoFoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [laudoOpen, setLaudoOpen] = useState(false);
  const [laudoNumber, setLaudoNumber] = useState("");
  const [oficioNumber, setOficioNumber] = useState("");
  const [processoNumber, setProcessoNumber] = useState("");
  const [laudoHash, setLaudoHash] = useState("");
  const inputRefs = useRef<Record<"foto_antes" | "foto_depois", HTMLInputElement | null>>({
    foto_antes: null,
    foto_depois: null,
  });
  const galleryInputRefs = useRef<Record<"foto_antes" | "foto_depois", HTMLInputElement | null>>({
    foto_antes: null,
    foto_depois: null,
  });
  const extraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    Promise.all([
      getVeiculos("em_analise"),
      getDestruicoes(),
    ]).then(([v, d]) => {
      setVeiculos(v);
      setDestruicoes(d);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const selected = veiculos.find(v => v.id === selectedId) ?? destruicoes.find((item: any) => item.veiculo_id === selectedId)?.veiculos;
  const allDone = steps.foto_antes.done && steps.foto_depois.done;

  const laudoDocument = useMemo(() => {
    if (!selected) return null;
    const fotos: LaudoFoto[] = [];
    if (steps.foto_antes.publicUrl) fotos.push({ url: steps.foto_antes.publicUrl, label: "Veículo ANTES da destruição" });
    fotos.push(...reportPhotos);
    if (steps.foto_depois.publicUrl) fotos.push({ url: steps.foto_depois.publicUrl, label: "Veículo DEPOIS da destruição" });
    return buildLaudoDocument({
      veiculo: selected,
      laudoNumber: laudoNumber || `LD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      metodo,
      destructionDate: new Date().toISOString(),
      oficioNumber: oficioNumber || undefined,
      processoNumber: processoNumber || undefined,
      fotos,
      hash: laudoHash || undefined,
    });
  }, [laudoNumber, metodo, oficioNumber, processoNumber, selected, steps.foto_antes.publicUrl, steps.foto_depois.publicUrl, laudoHash, reportPhotos]);

  useEffect(() => {
    if (!selectedId) {
      setSteps({
        foto_antes: { done: false, fileName: "", publicUrl: "", storagePath: "" },
        foto_depois: { done: false, fileName: "", publicUrl: "", storagePath: "" },
      });
      setLaudoNumber("");
      setOficioNumber("");
      setProcessoNumber("");
      setLaudoHash("");
      setReportPhotos([]);
      return;
    }

    const selectedVehicle = veiculos.find((item) => item.id === selectedId);
    const draftKey = `patio-legal:laudo-draft:${selectedId}`;
    let savedDraft: { laudoNumber?: string; oficioNumber?: string; processoNumber?: string; metodo?: string } = {};
    if (typeof window !== "undefined") {
      try {
        savedDraft = JSON.parse(window.localStorage.getItem(draftKey) ?? "{}") as typeof savedDraft;
      } catch {
        savedDraft = {};
      }
    }
    const baseLaudoNumber = `LD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    setMetodo(savedDraft.metodo || "Tritura\u00e7\u00e3o");
    setLaudoNumber(savedDraft.laudoNumber || baseLaudoNumber);
    setOficioNumber(savedDraft.oficioNumber || "");
    setLaudoHash("");
    setProcessoNumber(savedDraft.processoNumber || selectedVehicle?.processo || "");

    Promise.all([
      supabase.from("fotos").select("tipo, storage_path, url, label, created_at").eq("veiculo_id", selectedId).order("created_at", { ascending: true }),
      supabase.from("laudos").select("numero, hash_sha256").eq("veiculo_id", selectedId).order("emitido_em", { ascending: false }).limit(1),
    ]).then(async ([mediaResult, laudoResult]) => {
      const mediaRows = await withSignedPhotoUrls(mediaResult.data ?? []);
      const nextSteps = {
        foto_antes: { done: false, fileName: "", publicUrl: "", storagePath: "" },
        foto_depois: { done: false, fileName: "", publicUrl: "", storagePath: "" },
      };

      mediaRows.forEach((item: any) => {
        if (item.tipo === "destruicao_antes") nextSteps.foto_antes = { done: true, fileName: item.storage_path?.split("/").pop() ?? "Arquivo enviado", publicUrl: item.url ?? "", storagePath: item.storage_path ?? "" };
        if (item.tipo === "destruicao_depois") nextSteps.foto_depois = { done: true, fileName: item.storage_path?.split("/").pop() ?? "Arquivo enviado", publicUrl: item.url ?? "", storagePath: item.storage_path ?? "" };
      });

      const labelMap: Record<string, string> = {
        frente: "Veículo - frente",
        traseira: "Veículo - traseira",
        lateral_esquerda: "Veículo - lateral esquerda",
        interior: "Veículo - interior",
        chegada: "Foto do cadastro do veículo",
        destruicao_extra: "Registro adicional da destruição",
      };
      setReportPhotos(mediaRows
        .filter((item: any) => item.url && !["destruicao_antes", "destruicao_depois"].includes(item.tipo))
        .map((item: any) => ({ url: item.url, label: item.label || labelMap[item.tipo] || "Registro fotográfico" })));

      setSteps(nextSteps);

      const latestLaudo = laudoResult.data?.[0]?.numero;
      if (latestLaudo) setLaudoNumber(latestLaudo);
      const latestHash = laudoResult.data?.[0]?.hash_sha256;
      if (latestHash) setLaudoHash(latestHash);
    }).catch(console.error);
  }, [selectedId]);

  const persistStepFile = async (stepId: "foto_antes" | "foto_depois", file: File) => {
    if (!selectedId) return;

    const tipoMap = {
      foto_antes: "destruicao_antes",
      foto_depois: "destruicao_depois",
    } as const;

    setDocBusy(true);
    setError("");
    try {
      const { data: previousRows } = await supabase
        .from("fotos")
        .select("id, storage_path")
        .eq("veiculo_id", selectedId)
        .eq("tipo", tipoMap[stepId]);
      const prepared = await prepareImageForUpload(file);
      const safeName = prepared.filename.replace(/\s+/g, "-");
      const storagePath = `${selectedId}/destruicao/${stepId}_${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("fotos-veiculos")
        .upload(storagePath, prepared.blob, { upsert: true, contentType: prepared.contentType });

      if (uploadError) throw uploadError;

      const signedUrl = await getSignedPhotoUrl(storagePath);

      const { error: insertError } = await supabase.from("fotos").insert({
        veiculo_id: selectedId,
        storage_path: storagePath,
        url: signedUrl,
        tipo: tipoMap[stepId],
        label: file.name,
      });

      if (insertError) throw insertError;

      const previousIds = (previousRows ?? []).map((row: { id: string }) => row.id);
      if (previousIds.length > 0) {
        const { error: cleanupError } = await supabase.from("fotos").delete().in("id", previousIds);
        if (cleanupError) throw cleanupError;
        const previousPaths = (previousRows ?? [])
          .map((row: { storage_path?: string | null }) => row.storage_path)
          .filter((path): path is string => !!path);
        if (previousPaths.length > 0) {
          await supabase.storage.from("fotos-veiculos").remove(previousPaths);
        }
      }

      setSteps((current) => ({
        ...current,
        [stepId]: {
          done: true,
          fileName: file.name,
          publicUrl: signedUrl ?? "",
          storagePath,
        },
      }));
    } catch (uploadErr: any) {
      setError(uploadErr.message ?? "Não foi possível enviar o arquivo desta etapa.");
    } finally {
      setDocBusy(false);
    }
  };

  const persistExtraFiles = async (files: File[]) => {
    if (!selectedId || files.length === 0) return;
    setDocBusy(true);
    setError("");
    try {
      const uploaded: LaudoFoto[] = [];
      for (const file of files) {
        const prepared = await prepareImageForUpload(file);
        const safeName = prepared.filename.replace(/\s+/g, "-");
        const storagePath = `${selectedId}/destruicao/extra_${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from("fotos-veiculos").upload(storagePath, prepared.blob, { upsert: true, contentType: prepared.contentType });
        if (uploadError) throw uploadError;
        const signedUrl = await getSignedPhotoUrl(storagePath);
        const { error: insertError } = await supabase.from("fotos").insert({ veiculo_id: selectedId, storage_path: storagePath, url: signedUrl, tipo: "destruicao_extra", label: file.name });
        if (insertError) throw insertError;
        if (signedUrl) uploaded.push({ url: signedUrl, label: file.name });
      }
      setReportPhotos((current) => [...current, ...uploaded]);
    } catch (uploadErr: any) {
      setError(uploadErr.message ?? "Não foi possível enviar as fotos adicionais.");
    } finally {
      setDocBusy(false);
    }
  };

  const handleInputChange = async (stepId: "foto_antes" | "foto_depois", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await persistStepFile(stepId, file);
    event.target.value = "";
  };

  const openStepPicker = (stepId: "foto_antes" | "foto_depois", mode: "camera" | "gallery" = "camera") => {
    if (!selectedId) return;
    (mode === "camera" ? inputRefs : galleryInputRefs).current[stepId]?.click();
  };

  const handleExtraInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) await persistExtraFiles(files);
    event.target.value = "";
  };

  const openLaudo = () => {
    if (!selectedId || !allDone) return;
    setLaudoOpen(true);
  };

  const handleSalvarRascunho = async () => {
    if (!selectedId) return;
    setSavingDraft(true);
    setError("");
    setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existingDestruicao, error: lookupError } = await supabase
        .from("destruicoes")
        .select("id")
        .eq("veiculo_id", selectedId)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existingDestruicao?.id) {
        const { error: updateError } = await supabase
          .from("destruicoes")
          .update({ metodo, operador_nome: user?.email ?? "Operador", finalizado: false, finalizado_em: null })
          .eq("id", existingDestruicao.id);
        if (updateError) throw updateError;
      } else {
        await createDestruicao({
          veiculo_id: selectedId,
          metodo,
          operador_nome: user?.email ?? "Operador",
          finalizado: false,
        });
      }

      setSuccess("Rascunho salvo. As fotos continuam editáveis até a finalização definitiva.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`patio-legal:laudo-draft:${selectedId}`, JSON.stringify({
          laudoNumber,
          oficioNumber,
          processoNumber,
          metodo,
        }));
      }
      setDestruicoes(await getDestruicoes());
    } catch (err: any) {
      setError(err.message ?? "Não foi possível salvar o rascunho.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleFinalizar = async () => {
    if (!selectedId || !allDone) return;
    setSaving(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const finalizadoEm = new Date().toISOString();
      const { data: existingDestruicao } = await supabase
        .from("destruicoes")
        .select("id")
        .eq("veiculo_id", selectedId)
        .maybeSingle();

      let destruicaoId = existingDestruicao?.id;

      if (destruicaoId) {
        const { error: updateError } = await supabase
          .from("destruicoes")
          .update({ metodo, operador_nome: user?.email ?? "Operador", finalizado: true, finalizado_em: finalizadoEm })
          .eq("id", destruicaoId);
        if (updateError) throw updateError;
      } else {
        const created = await createDestruicao({
          veiculo_id: selectedId,
          metodo,
          operador_nome: user?.email ?? "Operador",
          finalizado: true,
          finalizado_em: finalizadoEm,
        });
        destruicaoId = created.id;
      }

      await updateVeiculo(selectedId, { status: "destruido" as any });

      const { data: existingLaudo } = await supabase
        .from("laudos")
        .select("id")
        .eq("veiculo_id", selectedId)
        .maybeSingle();

      if (!existingLaudo?.id) {
        const finalLaudoNumber = laudoNumber || `LD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const canonical = buildVeiculoLaudoCanonicalContent({
          laudoNumber: finalLaudoNumber,
          veiculo: selected as Veiculo,
          metodo,
          destructionMoment: finalizadoEm,
          oficio: oficioNumber || "",
          processo: processoNumber || selected?.processo || "",
        });
        const hash = await computeSha256Hex(canonical);
        await createLaudo({
          numero: finalLaudoNumber,
          veiculo_id: selectedId,
          destruicao_id: destruicaoId,
          responsavel_nome: user?.email ?? "Operador",
          emitido_em: finalizadoEm,
          hash_sha256: hash,
        });
        setLaudoHash(hash);
      }

      setSuccess(`Destruição do veículo ${selected?.placa} finalizada com sucesso!`);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`patio-legal:laudo-draft:${selectedId}`);
      }
      const [v, d] = await Promise.all([getVeiculos("em_analise"), getDestruicoes()]);
      setVeiculos(v);
      setDestruicoes(d);
      setLaudoOpen(true);
    } catch (err: any) {
      setError(err.message ?? "Erro ao finalizar destruição.");
    } finally {
      setSaving(false);
    }
  };

  const stepList = [
    { id: "foto_antes" as const, label: "Foto do ANTES", done: steps.foto_antes.done, icon: Camera, accept: "image/*", helper: steps.foto_antes.fileName },
    { id: "foto_depois" as const, label: "Foto do DEPOIS", done: steps.foto_depois.done, icon: Camera, accept: "image/*", helper: steps.foto_depois.fileName },
    { id: null, label: "Geração do laudo", done: allDone, icon: FileCheck2, accept: "", helper: laudoNumber || "Laudo pronto para revisão" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Motor de destruição"
        title="Destruição controlada"
        description="Fluxo travado com validade jurídica — laudo gerado server-side com QR Code e hash SHA-256."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando…</span>
        </div>
      ) : (
        <>
          {success && (
            <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-success text-sm font-medium">
              ✓ {success}
            </div>
          )}

          <div className="rounded-xl bg-gradient-card border border-gold/30 p-6 shadow-glow">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center shrink-0">
                <Flame className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Nova operação de destruição</h2>
                <p className="text-sm text-muted-foreground">Selecione o veículo em análise e siga os passos obrigatórios.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <Label>Veículo em análise <span className="text-destructive">*</span></Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="bg-muted/40">
                    <SelectValue placeholder="Selecione o veículo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {veiculos.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa} — {v.marca_modelo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Método de destruição</Label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger className="bg-muted/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Trituração">Trituração</SelectItem>
                    <SelectItem value="Prensagem">Prensagem</SelectItem>
                    <SelectItem value="Corte">Corte</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selected && (
              <div className="rounded-lg bg-muted/20 border border-border p-3 mb-6 text-sm">
                <span className="text-gold font-mono font-semibold">{selected.placa}</span>
                {" • "}{selected.marca_modelo}
                {selected.ano && ` • ${selected.ano}`}
                {selected.processo && <span className="text-muted-foreground"> • Proc. <span className="font-mono">{selected.processo}</span></span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              {stepList.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    onClick={() => (s.id ? openStepPicker(s.id) : openLaudo())}
                    className={`rounded-lg border p-4 transition-all ${
                      s.done ? "bg-success/10 border-success/30" : "bg-muted/20 border-border"
                    } ${(s.id ? !!selectedId : allDone) ? "cursor-pointer hover:border-gold/50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-5 w-5 ${s.done ? "text-success" : "text-muted-foreground"}`} />
                      {s.done ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Etapa {i + 1}</p>
                    <p className="font-semibold text-sm">{s.label}</p>
                    {s.id && selectedId && !s.done && (
                      <p className="text-[10px] text-gold mt-1">Clique para selecionar o arquivo</p>
                    )}
                    {s.id && s.helper && (
                      <p className="text-[10px] text-muted-foreground mt-1 break-all">{s.helper}</p>
                    )}
                    {s.id && selectedId && (
                      <div className="flex flex-wrap gap-2 mt-3" onClick={(event) => event.stopPropagation()}>
                        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => openStepPicker(s.id!, "camera")}><Camera className="h-3.5 w-3.5" /> Câmera</Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => openStepPicker(s.id!, "gallery")}><FilePenLine className="h-3.5 w-3.5" /> Arquivo</Button>
                      </div>
                    )}
                    {!s.id && allDone && (
                      <p className="text-[10px] text-gold mt-1">Clique para abrir o laudo pré-preenchido</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden">
              <input ref={(node) => { inputRefs.current.foto_antes = node; }} type="file" accept="image/*" capture="environment" onChange={(event) => void handleInputChange("foto_antes", event)} />
              <input ref={(node) => { inputRefs.current.foto_depois = node; }} type="file" accept="image/*" capture="environment" onChange={(event) => void handleInputChange("foto_depois", event)} />
              <input ref={(node) => { galleryInputRefs.current.foto_antes = node; }} type="file" accept="image/*" onChange={(event) => void handleInputChange("foto_antes", event)} />
              <input ref={(node) => { galleryInputRefs.current.foto_depois = node; }} type="file" accept="image/*" onChange={(event) => void handleInputChange("foto_depois", event)} />
              <input ref={extraInputRef} type="file" accept="image/*" multiple onChange={(event) => void handleExtraInputChange(event)} />
            </div>

            {selectedId && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-gold/40 bg-gold/5 px-4 py-3 mb-4">
                <div>
                  <p className="text-sm font-semibold">Mais fotos para o laudo</p>
                  <p className="text-xs text-muted-foreground">Selecione várias imagens já salvas no celular ou no computador. Elas serão incluídas sem deformação.</p>
                </div>
                <Button type="button" variant="outline" className="gap-2" onClick={() => extraInputRef.current?.click()}><FilePenLine className="h-4 w-4" /> Escolher arquivos</Button>
              </div>
            )}

            {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedId || saving || savingDraft || docBusy}
                onClick={() => void handleSalvarRascunho()}
                className="gap-2 border-gold/40"
              >
                {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar rascunho
              </Button>
              <Button
                onClick={handleFinalizar}
                disabled={!allDone || !selectedId || saving || savingDraft || docBusy}
                className={`gap-2 ${allDone && selectedId ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "opacity-50 cursor-not-allowed bg-muted"}`}
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Finalizando…</> : <><Flame className="h-4 w-4" /> Finalizar destruição</>}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!allDone || !selectedId || docBusy}
                onClick={openLaudo}
                className="gap-2 border-border"
              >
                {docBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />} Abrir laudo
              </Button>
              <p className="text-xs text-muted-foreground self-center">
                {!selectedId ? "⚠️ Selecione um veículo primeiro." : !allDone ? "⚠️ Complete todas as etapas obrigatórias." : "✓ Pronto para finalizar."}
              </p>
            </div>
          </div>

          {destruicoes.length > 0 && (
            <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold text-lg">Histórico de destruições</h3>
                <p className="text-xs text-muted-foreground">Operações registradas no sistema</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground bg-muted/20 uppercase tracking-wider">
                      <th className="px-5 py-3 font-medium">Placa</th>
                      <th className="px-5 py-3 font-medium">Modelo</th>
                      <th className="px-5 py-3 font-medium">Método</th>
                      <th className="px-5 py-3 font-medium">Operador</th>
                      <th className="px-5 py-3 font-medium">Data</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destruicoes.map((d: any) => (
                      <tr key={d.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-gold">{d.veiculos?.placa ?? "—"}</td>
                        <td className="px-5 py-3">{d.veiculos?.marca_modelo ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{d.metodo}</td>
                        <td className="px-5 py-3 text-muted-foreground">{d.operador_nome ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${d.finalizado ? "bg-success/15 text-success border border-success/30" : "bg-warning/15 text-warning border border-warning/30"}`}>
                            {d.finalizado ? "Concluído" : "Em andamento"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
              <h3 className="font-semibold text-lg mb-4">Como funciona o fluxo</h3>
              <ol className="space-y-3 text-sm">
                {[
                  "Selecione o veículo em análise e o método de destruição.",
                  "Registre a foto ANTES da destruição (obrigatório).",
                  "Registre a foto DEPOIS da destruição (obrigatório).",
                  "Clique em 'Finalizar destruição' para gerar o laudo.",
                  "Laudo com numeração LD-ANO-XXXX e hash SHA-256 é gerado automaticamente.",
                ].map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-gold/15 text-gold border border-gold/30 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
              <h3 className="font-semibold text-lg mb-4">Assinatura tecnológica</h3>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/30 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck2 className="h-4 w-4 text-gold" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Numeração automática</span>
                  </div>
                  <p className="font-mono font-bold text-gold text-lg">LD-{new Date().getFullYear()}-XXXX</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="h-4 w-4 text-gold" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QR Code do laudo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Link permanente para validação do laudo e conferência do registro fotográfico</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-gold" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SHA-256 anti-fraude</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Hash calculado no momento da emissão — documento imutável</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={laudoOpen} onOpenChange={setLaudoOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Laudo pré-preenchido de destruição</DialogTitle>
          </DialogHeader>

          {laudoDocument ? (
            <>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Campos editáveis do laudo</p>
                  <p className="text-xs text-muted-foreground">No celular web, altere aqui os dados variáveis antes de gerar Word, PDF ou enviar no WhatsApp.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="laudo-number">Nº do laudo</Label>
                    <Input id="laudo-number" value={laudoNumber} onChange={(event) => setLaudoNumber(event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oficio-number">Ofício requisitante</Label>
                    <Input id="oficio-number" value={oficioNumber} onChange={(event) => setOficioNumber(event.target.value)} placeholder="Informe o ofício requisitante" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="processo-number">Processo / Inquérito</Label>
                  <Input id="processo-number" value={processoNumber} onChange={(event) => setProcessoNumber(event.target.value)} placeholder="Informe o processo ou inquérito" />
                </div>
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
            </>
          ) : (
            <div className="py-8 text-sm text-muted-foreground">Selecione um veículo e conclua as etapas anteriores para abrir o laudo.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

