import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DocumentPreview } from "@/components/DocumentPreview";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, FileCheck2, Eye, Lock, Loader2, MessageCircle, FilePenLine } from "lucide-react";
import { buildLaudoDocument, buildLaudoObjetoDocument, downloadPdfDocument, downloadWordDocument, shareDocumentViaWhatsApp, type LaudoFoto } from "@/lib/document-utils";
import { getLaudos, getObjeto, getVeiculo, type Objeto, type Veiculo } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { withSignedPhotoUrls } from "@/lib/storage";

export const Route = createFileRoute("/laudos")({
  component: LaudosPage,
  head: () => ({ meta: [{ title: "Laudos - Patio Legal" }] }),
});

const FOTO_TIPOS = ["destruicao_antes", "destruicao_depois", "destruicao_extra", "frente", "traseira", "lateral_esquerda", "interior", "chegada"];

function LaudosPage() {
  const [laudos, setLaudos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  const [selectedObject, setSelectedObject] = useState<Objeto | null>(null);
  const [selectedFotos, setSelectedFotos] = useState<LaudoFoto[]>([]);

  const requestedLaudoNumber = useMemo(() => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("numero");
    return value?.trim().toLowerCase() ?? "";
  }, []);

  useEffect(() => {
    getLaudos()
      .then(data => {
        setLaudos(data);
        if (data.length === 0) return;

        const requested = requestedLaudoNumber
          ? data.find((item) => item.numero?.toLowerCase() === requestedLaudoNumber)
          : null;
        setSelected(requested ?? data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [requestedLaudoNumber]);

  useEffect(() => {
    const vehicleId = selected?.veiculo_id as string | undefined;
    const objectId = selected?.objeto_id as string | undefined;
    if (!vehicleId && !objectId) {
      setSelectedVehicle(null);
      setSelectedObject(null);
      setSelectedFotos([]);
      return;
    }

    setSelectedVehicle(null);
    setSelectedObject(null);
    const labelMap: Record<string, string> = {
      destruicao_antes: "Bem ANTES da destruicao",
      destruicao_depois: "Bem DEPOIS da destruicao",
      destruicao_extra: "Registro adicional da destruicao",
      frente: "Registro - frente",
      traseira: "Registro - traseira",
      lateral_esquerda: "Registro - lateral esquerda",
      interior: "Registro - interior",
      chegada: "Foto do cadastro do bem",
    };

    const load = async () => {
      const [record, fotoResult] = await Promise.all([
        vehicleId ? getVeiculo(vehicleId) : getObjeto(objectId as string),
        supabase
          .from("fotos")
          .select("tipo, storage_path, url, label, created_at")
          .eq(vehicleId ? "veiculo_id" : "objeto_id", (vehicleId ?? objectId) as string)
          .in("tipo", FOTO_TIPOS),
      ]);

      if (vehicleId) setSelectedVehicle(record as Veiculo);
      else setSelectedObject(record as Objeto);

      const photoRows = await withSignedPhotoUrls(fotoResult.data ?? []);
      const latestBySingleType = new Map<string, any>();
      const additionalRows: any[] = [];
      for (const photo of photoRows.filter((f: any) => !!f.url)) {
        if (photo.tipo === "destruicao_antes" || photo.tipo === "destruicao_depois") {
          const current = latestBySingleType.get(photo.tipo);
          if (!current || new Date(photo.created_at).getTime() >= new Date(current.created_at).getTime()) {
            latestBySingleType.set(photo.tipo, photo);
          }
        } else {
          additionalRows.push(photo);
        }
      }

      const fotos: LaudoFoto[] = [...latestBySingleType.values(), ...additionalRows]
        .sort((a: any, b: any) => {
          const order = (tipo: string) => tipo === "destruicao_antes" ? 0 : tipo === "destruicao_depois" ? 2 : 1;
          return order(a.tipo) - order(b.tipo) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
        .map((f: any) => ({ url: f.url as string, label: f.label || labelMap[f.tipo] || f.tipo }));
      setSelectedFotos(fotos);
    };

    load().catch(() => {
      setSelectedVehicle(null);
      setSelectedObject(null);
      setSelectedFotos([]);
    });
  }, [selected?.veiculo_id, selected?.objeto_id]);

  const selectedDocument = useMemo(() => {
    if (!selected) return null;
    if (selectedVehicle) {
      return buildLaudoDocument({
        veiculo: selectedVehicle,
        laudoNumber: selected.numero,
        metodo: "Trituração",
        destructionDate: selected.emitido_em,
        fotos: selectedFotos,
        hash: selected.hash_sha256 || undefined,
      });
    }
    if (selectedObject) {
      return buildLaudoObjetoDocument({
        objeto: selectedObject,
        laudoNumber: selected.numero,
        metodo: "Trituração",
        destructionDate: selected.emitido_em,
        fotos: selectedFotos,
        hash: selected.hash_sha256 || undefined,
      });
    }
    return null;
  }, [selected, selectedVehicle, selectedObject, selectedFotos]);

  const normalizedQuery = query.toLowerCase();
  const filtered = laudos.filter(l =>
    !query ||
    l.numero.toLowerCase().includes(normalizedQuery) ||
    (l.veiculos?.placa ?? "").toLowerCase().includes(normalizedQuery) ||
    (l.objetos?.descricao ?? "").toLowerCase().includes(normalizedQuery) ||
    (l.responsavel_nome ?? "").toLowerCase().includes(normalizedQuery)
  );

  return (
    <>
      <PageHeader
        eyebrow="Documentos com validade juridica"
        title="Laudos periciais"
        description="Documentos imutaveis apos emissao. Auditaveis por hash SHA-256 e QR Code."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2 border-border" disabled={!selectedDocument} onClick={() => selectedDocument && void downloadWordDocument(selectedDocument)}>
              <FilePenLine className="h-4 w-4" /> Word
            </Button>
            <Button variant="outline" className="gap-2 border-border" disabled={!selectedDocument} onClick={() => selectedDocument && void downloadPdfDocument(selectedDocument)}>
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button className="gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]" disabled={!selectedDocument} onClick={() => selectedDocument && void shareDocumentViaWhatsApp(selectedDocument, "pdf")}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero de laudo, placa, objeto ou responsavel..."
              className="pl-10 bg-muted/40"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando laudos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <FileCheck2 className="h-12 w-12 opacity-30" />
              <p className="font-medium">Nenhum laudo encontrado</p>
              <p className="text-sm">Os laudos sao gerados apos a conclusao de uma destruicao</p>
            </div>
          ) : (
            filtered.map((l) => {
              const relationLabel = l.veiculos?.placa ? "Placa" : "Bem";
              const relationValue = l.veiculos?.placa ?? l.objetos?.descricao ?? "-";
              return (
                <div
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className={`rounded-xl bg-gradient-card border p-5 shadow-elegant hover:border-gold-subtle transition-all cursor-pointer ${selected?.id === l.id ? "border-gold/50" : "border-border"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                      <FileCheck2 className="h-6 w-6 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-gold">{l.numero}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span>{relationLabel}: <span className="text-foreground font-mono">{relationValue}</span></span>
                        <span>{new Date(l.emitido_em).toLocaleString("pt-BR")}</span>
                        {l.responsavel_nome && <span>Responsavel: {l.responsavel_nome}</span>}
                      </div>
                      {l.hash_sha256 && (
                        <p className="mt-1 text-[10px] font-mono text-muted-foreground/80 truncate" title={l.hash_sha256}>
                          SHA-256: {l.hash_sha256}
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-success/15 text-success border border-success/30 shrink-0 hidden sm:inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Emitido
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-gold" onClick={() => setSelected(l)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-gold" onClick={() => selected?.id === l.id && selectedDocument ? void downloadPdfDocument(selectedDocument) : void 0}><Download className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="rounded-xl bg-gradient-card border border-gold/30 p-6 shadow-glow h-fit">
          {selectedDocument ? (
            <>
              <DocumentPreview document={selectedDocument} />
              <div className="flex flex-wrap gap-2 mt-4 justify-end">
                <Button variant="outline" className="gap-2 border-border" onClick={() => void downloadWordDocument(selectedDocument)}>
                  <FilePenLine className="h-4 w-4" /> Word
                </Button>
                <Button variant="outline" className="gap-2 border-border" onClick={() => void downloadPdfDocument(selectedDocument)}>
                  <Download className="h-4 w-4" /> PDF completo
                </Button>
                <Button className="gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]" onClick={() => void shareDocumentViaWhatsApp(selectedDocument, "pdf")}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um laudo para visualizar</p>
          )}
        </div>
      </div>
    </>
  );
}
