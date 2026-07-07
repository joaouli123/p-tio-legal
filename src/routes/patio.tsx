import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildListExportDocument, downloadPdfDocument, downloadWordDocument, formatVehicleStatusLabel, shareDocumentViaWhatsApp, type ExportableDocument } from "@/lib/document-utils";
import { addHistorico, getVeiculos, updateVeiculo, type Veiculo } from "@/lib/db";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, ChevronRight, Download, FilePenLine, FileText, Loader2, MapPin, MessageCircle, Warehouse } from "lucide-react";

export const Route = createFileRoute("/patio")({
  component: PatioPage,
  head: () => ({ meta: [{ title: "Pátio — Pátio Legal" }] }),
});

type SectorId = "A" | "B" | "C" | "D" | "EXTERNO";

const setores: {
  id: SectorId;
  nome: string;
  descricao: string;
  capacidade: number;
  iconClassName: string;
  activeClassName: string;
  badgeClassName: string;
  progressClassName: string;
}[] = [
  {
    id: "A",
    nome: "Setor A",
    descricao: "Automóveis",
    capacidade: 500,
    iconClassName: "bg-info/15 text-info border border-info/30",
    activeClassName: "border-info/50 bg-info/10",
    badgeClassName: "border-info/30 bg-info/15 text-info",
    progressClassName: "bg-info",
  },
  {
    id: "B",
    nome: "Setor B",
    descricao: "Motos",
    capacidade: 400,
    iconClassName: "bg-gold/15 text-gold border border-gold/30",
    activeClassName: "border-gold/50 bg-gold/10",
    badgeClassName: "border-gold/30 bg-gold/15 text-gold",
    progressClassName: "bg-gold",
  },
  {
    id: "C",
    nome: "Setor C",
    descricao: "Caminhões",
    capacidade: 400,
    iconClassName: "bg-destructive/15 text-destructive border border-destructive/30",
    activeClassName: "border-destructive/50 bg-destructive/10",
    badgeClassName: "border-destructive/30 bg-destructive/15 text-destructive",
    progressClassName: "bg-destructive",
  },
  {
    id: "D",
    nome: "Setor D",
    descricao: "Peças / Outros",
    capacidade: 300,
    iconClassName: "bg-success/15 text-success border border-success/30",
    activeClassName: "border-success/50 bg-success/10",
    badgeClassName: "border-success/30 bg-success/15 text-success",
    progressClassName: "bg-success",
  },
  {
    id: "EXTERNO",
    nome: "Pátio externo",
    descricao: "Área externa",
    capacidade: 400,
    iconClassName: "bg-muted text-muted-foreground border border-border",
    activeClassName: "border-foreground/20 bg-muted/60",
    badgeClassName: "border-border bg-muted text-muted-foreground",
    progressClassName: "bg-muted-foreground",
  },
];

const PATIO_EXPORT_HEADERS = ["Setor", "Vaga", "Placa", "Marca / Modelo", "Delegacia", "Processo", "Status"];
const PATIO_GROUPED_EXPORT_HEADERS = ["Vaga", "Placa", "Marca / Modelo", "Delegacia", "Processo", "Status"];

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function resolveSectorId(value?: string | null): SectorId | null {
  const normalized = normalizeText(value);

  if (!normalized) return null;
  if (normalized === "A" || normalized.includes("SETOR A")) return "A";
  if (normalized === "B" || normalized.includes("SETOR B")) return "B";
  if (normalized === "C" || normalized.includes("SETOR C")) return "C";
  if (normalized === "D" || normalized.includes("SETOR D")) return "D";
  if (normalized === "EXTERNO" || normalized.startsWith("EXTERNO-") || normalized.includes("PATIO EXTERNO") || normalized.includes("AREA EXTERNA")) {
    return "EXTERNO";
  }

  return null;
}

function inferSectorId(veiculo: Veiculo): SectorId | null {
  const explicitSector = resolveSectorId(veiculo.setor);
  if (explicitSector) return explicitSector;

  const vaga = normalizeText(veiculo.local_vaga);

  if (!vaga) return null;
  if (/(PATIO EXTERNO|AREA EXTERNA|EXTERNO|EXTERNA)/.test(vaga)) return "EXTERNO";
  if (/(\bSETOR A\b|\bVAGA A[-\s]?\d+\b|\bA[-\s]?\d+\b)/.test(vaga)) return "A";
  if (/(\bSETOR B\b|\bVAGA B[-\s]?\d+\b|\bB[-\s]?\d+\b|\bMOTO\b|\bM[-\s]?\d+\b)/.test(vaga)) return "B";
  if (/(\bSETOR C\b|\bVAGA C[-\s]?\d+\b|\bC[-\s]?\d+\b|\bCAMINHAO\b|\bONIBUS\b)/.test(vaga)) return "C";
  if (/(\bSETOR D\b|\bVAGA D[-\s]?\d+\b|\bD[-\s]?\d+\b|\bPECA\b|\bPECAS\b|\bOUTROS\b)/.test(vaga)) return "D";

  return null;
}

function buildPatioLocation(sectorId: SectorId, detalhe: string) {
  const setorNome = setores.find((setor) => setor.id === sectorId)?.nome ?? sectorId;
  if (detalhe.trim()) return `${setorNome} · ${detalhe.trim()}`;
  return setorNome;
}

function sortByLocation(a: Veiculo, b: Veiculo) {
  const localA = normalizeText(a.local_vaga) || "ZZZZ";
  const localB = normalizeText(b.local_vaga) || "ZZZZ";

  return localA.localeCompare(localB, "pt-BR") || a.placa.localeCompare(b.placa, "pt-BR");
}

function formatExportTimestamp(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

interface MovementFormState {
  vehicleId: string;
  setor: SectorId | "";
  detalhe: string;
}

function PatioPage() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSector, setSelectedSector] = useState<SectorId | null>(null);
  const vehicleListRef = useRef<HTMLDivElement>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementSaving, setMovementSaving] = useState(false);
  const [movementError, setMovementError] = useState("");
  const [movementForm, setMovementForm] = useState<MovementFormState>({ vehicleId: "", setor: "", detalhe: "" });

  useEffect(() => {
    getVeiculos()
      .then(setVeiculos)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Não foi possível carregar as localizações do pátio.");
      })
      .finally(() => setLoading(false));
  }, []);

  // inferSectorId is comparatively expensive (regex over several fields). Compute
  // it once per vehicle and reuse the map across grouping/filtering/export.
  const sectorByVehicleId = useMemo(() => {
    const map = new Map<string, SectorId | null>();
    for (const veiculo of veiculos) {
      map.set(veiculo.id, inferSectorId(veiculo));
    }
    return map;
  }, [veiculos]);

  const sectorOf = (veiculo: Veiculo): SectorId | null =>
    sectorByVehicleId.get(veiculo.id) ?? null;

  const agrupadosPorSetor = useMemo(() => {
    const grouped: Record<SectorId, Veiculo[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
      EXTERNO: [],
    };

    for (const veiculo of veiculos) {
      const sectorId = sectorByVehicleId.get(veiculo.id) ?? null;
      if (sectorId) grouped[sectorId].push(veiculo);
    }

    Object.values(grouped).forEach((items) => items.sort(sortByLocation));

    return grouped;
  }, [veiculos, sectorByVehicleId]);

  const semLocalizacao = useMemo(
    () => veiculos.filter((veiculo) => !(sectorByVehicleId.get(veiculo.id) ?? null)),
    [veiculos, sectorByVehicleId],
  );

  const setorSelecionado = selectedSector
    ? setores.find((setor) => setor.id === selectedSector) ?? null
    : null;

  const veiculosDoSetor = selectedSector ? agrupadosPorSetor[selectedSector] : [];

  const veiculosParaMovimentacao = useMemo(() => {
    const scoped = selectedSector ? veiculos.filter((veiculo) => (sectorByVehicleId.get(veiculo.id) ?? null) === selectedSector) : veiculos;
    const candidates = scoped.length > 0 ? scoped : veiculos;
    return [...candidates].sort(sortByLocation);
  }, [selectedSector, veiculos, sectorByVehicleId]);

  const patioExportVehicles = useMemo(() => {
    if (selectedSector) return [...veiculosDoSetor];
    return [...veiculos].sort(sortByLocation);
  }, [selectedSector, veiculos, veiculosDoSetor]);

  const setoresComVeiculosCount = useMemo(
    () => setores.filter((setor) => agrupadosPorSetor[setor.id].length > 0).length,
    [agrupadosPorSetor],
  );

  const patioExportScopeLabel = selectedSector
    ? `${setorSelecionado?.nome ?? selectedSector} • lista completa do setor`
    : "Pátio completo • todos os veículos cadastrados";

  const patioExportDocument = useMemo(() => buildListExportDocument({
    title: selectedSector ? `LISTAGEM DO ${setorSelecionado?.nome?.toUpperCase() ?? selectedSector}` : "LISTAGEM COMPLETA DO PÁTIO",
    subtitle: "Pátio Legal Maringá SAT • Exportação integral da gestão de localização",
    filenameLabel: selectedSector ? `patio-${selectedSector}` : "patio-completo",
    meta: [
      { label: "Escopo", value: patioExportScopeLabel },
      { label: "Veículos sem localização", value: String(semLocalizacao.length) },
      { label: "Setores com veículos", value: String(setoresComVeiculosCount) },
    ],
    paragraphs: [
      selectedSector
        ? `Esta exportação reúne a lista completa dos veículos atualmente localizados em ${setorSelecionado?.nome ?? selectedSector}, com vaga, origem e processo para conferência física.`
        : "Esta exportação reúne a lista completa dos veículos cadastrados na gestão de pátio, incluindo setor identificado, vaga registrada e status operacional.",
      selectedSector
        ? `Foram encontrados ${patioExportVehicles.length} veículo(s) no setor selecionado.`
        : `Foram encontrados ${patioExportVehicles.length} veículo(s) no pátio completo.${semLocalizacao.length > 0 ? ` ${semLocalizacao.length} ainda estão sem localização definida.` : ""}`,
    ],
    headers: PATIO_EXPORT_HEADERS,
    rows: patioExportVehicles.map((vehicle) => {
      const sectorId = sectorByVehicleId.get(vehicle.id) ?? null;
      const sectorName = sectorId ? (setores.find((setor) => setor.id === sectorId)?.nome ?? sectorId) : "Sem setor definido";

      return [
        sectorName,
        vehicle.local_vaga ?? "—",
        vehicle.placa,
        vehicle.marca_modelo,
        vehicle.delegacia_nome ?? "—",
        vehicle.processo ?? "—",
        formatVehicleStatusLabel(vehicle.status),
      ];
    }),
  }), [patioExportScopeLabel, patioExportVehicles, selectedSector, semLocalizacao.length, setorSelecionado, setoresComVeiculosCount, sectorByVehicleId]);

  const patioGroupedExportDocument = useMemo<ExportableDocument>(() => {
    const issuedAt = formatExportTimestamp();
    const tables = setores
      .filter((setor) => agrupadosPorSetor[setor.id].length > 0)
      .map((setor) => ({
        title: `${setor.nome.toUpperCase()} (${agrupadosPorSetor[setor.id].length} veículo(s))`,
        headers: PATIO_GROUPED_EXPORT_HEADERS,
        rows: agrupadosPorSetor[setor.id].map((vehicle) => [
          vehicle.local_vaga ?? "—",
          vehicle.placa,
          vehicle.marca_modelo,
          vehicle.delegacia_nome ?? "—",
          vehicle.processo ?? "—",
          formatVehicleStatusLabel(vehicle.status),
        ]),
      }));

    if (semLocalizacao.length > 0) {
      tables.push({
        title: `SEM SETOR DEFINIDO (${semLocalizacao.length} veículo(s))`,
        headers: PATIO_GROUPED_EXPORT_HEADERS,
        rows: semLocalizacao.map((vehicle) => [
          vehicle.local_vaga ?? "—",
          vehicle.placa,
          vehicle.marca_modelo,
          vehicle.delegacia_nome ?? "—",
          vehicle.processo ?? "—",
          formatVehicleStatusLabel(vehicle.status),
        ]),
      });
    }

    return {
      title: "LISTAGEM COMPLETA DO PÁTIO POR SETOR",
      subtitle: "Pátio Legal Maringá SAT • Exportação setorizada para conferência física e auditoria",
      filenameBase: "patio-completo-por-setor",
      kind: "report",
      fields: {
        periodLabel: "Todos os setores discriminados",
        issuedAt,
      },
      meta: [
        { label: "Escopo", value: "Todos os setores discriminados" },
        { label: "Total de veículos", value: String(veiculos.length) },
        { label: "Setores com veículos", value: String(setoresComVeiculosCount) },
        { label: "Veículos sem localização", value: String(semLocalizacao.length) },
      ],
      sections: [
        {
          title: "ESCOPO DA EXPORTAÇÃO",
          paragraphs: [
            "Esta exportação organiza os veículos por setor para conferência física, auditoria e inspeções presenciais.",
            `Os veículos estão separados por ${setoresComVeiculosCount} setor(es) com identificação individual de vaga, origem, processo e status operacional.`,
            semLocalizacao.length > 0 ? `${semLocalizacao.length} veículo(s) permanecem sem setor definido e foram listados em uma seção separada.` : "",
          ].filter(Boolean),
        },
      ],
      tables,
      footer: [
        `Documento emitido em ${issuedAt}.`,
        "PÁTIO LEGAL MARINGÁ SAT",
      ],
    };
  }, [agrupadosPorSetor, semLocalizacao, setoresComVeiculosCount, veiculos.length]);

  const veiculoSelecionadoMovimentacao = useMemo(
    () => veiculos.find((veiculo) => veiculo.id === movementForm.vehicleId) ?? null,
    [movementForm.vehicleId, veiculos],
  );

  const handleSelectSector = (id: SectorId) => {
    setSelectedSector(id);
    setTimeout(() => {
      vehicleListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const abrirMovimentacao = (veiculo?: Veiculo) => {
    const preferredVehicle = veiculo ?? veiculosParaMovimentacao[0] ?? veiculos[0] ?? null;
    setMovementForm({
      vehicleId: preferredVehicle?.id ?? "",
      setor: selectedSector ?? (preferredVehicle ? sectorOf(preferredVehicle) ?? "" : ""),
      detalhe: "",
    });
    setMovementError("");
    setMovementOpen(true);
  };

  const handleMoveVehicle = async () => {
    if (!movementForm.vehicleId || !movementForm.setor) {
      setMovementError("Selecione o veículo e o novo setor para concluir a movimentação.");
      return;
    }

    const veiculo = veiculoSelecionadoMovimentacao;
    if (!veiculo) {
      setMovementError("O veículo selecionado não foi encontrado.");
      return;
    }

    setMovementSaving(true);
    setMovementError("");

    try {
      const origem = inferSectorId(veiculo);
      const destino = movementForm.setor;
      const novaLocalizacao = buildPatioLocation(destino, movementForm.detalhe);
      const veiculoAtualizado = await updateVeiculo(veiculo.id, {
        setor: destino,
        local_vaga: novaLocalizacao,
      });

      await addHistorico({
        veiculo_id: veiculo.id,
        tipo: "alocacao",
        titulo: "Movimentação de setor",
        detalhe: `Origem: ${origem ? setores.find((setor) => setor.id === origem)?.nome ?? origem : "Sem setor definido"} -> Destino: ${setores.find((setor) => setor.id === destino)?.nome ?? destino}${movementForm.detalhe.trim() ? ` • ${movementForm.detalhe.trim()}` : ""}`,
        usuario_nome: "Sistema web",
      }).catch(() => undefined);

      setVeiculos((current) => current.map((item) => (item.id === veiculo.id ? veiculoAtualizado : item)));
      setSelectedSector(destino);
      setMovementOpen(false);
    } catch (err: unknown) {
      setMovementError(err instanceof Error ? err.message : "Não foi possível concluir a movimentação.");
    } finally {
      setMovementSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Controle de pátio"
        title="Gestão de localização"
        description="Clique em um setor para ver a relação dos veículos alocados e a vaga exata registrada para localização."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-border" disabled={veiculos.length === 0}>
                  <Download className="h-4 w-4" /> {selectedSector ? "Exportar setor" : "Exportar listagens"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {selectedSector && (
                  <>
                    <DropdownMenuLabel>{`Setor atual: ${setorSelecionado?.nome ?? selectedSector}`}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => void downloadPdfDocument(patioExportDocument)}>
                      <FileText className="h-4 w-4" /> Setor atual em PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void downloadWordDocument(patioExportDocument)}>
                      <FilePenLine className="h-4 w-4" /> Setor atual em Word
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(patioExportDocument, "pdf")}>
                      <MessageCircle className="h-4 w-4" /> Setor atual no WhatsApp PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(patioExportDocument, "word")}>
                      <MessageCircle className="h-4 w-4" /> Setor atual no WhatsApp Word
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuLabel>Todos os setores discriminados</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void downloadPdfDocument(patioGroupedExportDocument)}>
                  <FileText className="h-4 w-4" /> Todos os setores em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void downloadWordDocument(patioGroupedExportDocument)}>
                  <FilePenLine className="h-4 w-4" /> Todos os setores em Word
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(patioGroupedExportDocument, "pdf")}>
                  <MessageCircle className="h-4 w-4" /> Todos os setores no WhatsApp PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(patioGroupedExportDocument, "word")}>
                  <MessageCircle className="h-4 w-4" /> Todos os setores no WhatsApp Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => abrirMovimentacao()}
              disabled={veiculos.length === 0}
              className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold"
            >
              <ArrowRightLeft className="h-4 w-4" /> Movimentação
            </Button>
          </>
        }
      />

      <Dialog open={movementOpen} onOpenChange={(open) => { setMovementOpen(open); if (!open) setMovementError(""); }}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Movimentar veículo</DialogTitle>
            <DialogDescription>
              Transfira o veículo entre setores e atualize a nova posição física registrada no pátio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="movimentacao-veiculo">Veículo</Label>
              <Select
                value={movementForm.vehicleId}
                onValueChange={(value) => {
                  const selectedVehicle = veiculos.find((veiculo) => veiculo.id === value) ?? null;
                  setMovementForm((current) => ({
                    ...current,
                    vehicleId: value,
                    setor: current.setor || (selectedVehicle ? sectorOf(selectedVehicle) ?? "" : ""),
                  }));
                }}
              >
                <SelectTrigger id="movimentacao-veiculo" className="bg-muted/40">
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {veiculosParaMovimentacao.map((veiculo) => (
                    <SelectItem key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa} • {veiculo.marca_modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {veiculoSelecionadoMovimentacao && (
              <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Setor atual</p>
                  <p className="font-semibold">
                    {(() => {
                      const currentSector = sectorOf(veiculoSelecionadoMovimentacao);
                      return currentSector ? (setores.find((setor) => setor.id === currentSector)?.nome ?? currentSector) : "Sem setor definido";
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Localização atual</p>
                  <p className="font-mono text-sm">{veiculoSelecionadoMovimentacao.local_vaga ?? "—"}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="movimentacao-setor">Novo setor</Label>
              <Select
                value={movementForm.setor}
                onValueChange={(value) => setMovementForm((current) => ({ ...current, setor: value as SectorId }))}
              >
                <SelectTrigger id="movimentacao-setor" className="bg-muted/40">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movimentacao-detalhe">Detalhe da nova vaga</Label>
              <Input
                id="movimentacao-detalhe"
                value={movementForm.detalhe}
                onChange={(event) => setMovementForm((current) => ({ ...current, detalhe: event.target.value }))}
                placeholder="Ex.: Fileira 02 · Vaga 08"
                className="bg-muted/40"
              />
            </div>

            {movementError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {movementError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="border-border" onClick={() => setMovementOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold" disabled={movementSaving} onClick={() => void handleMoveVehicle()}>
              {movementSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Confirmar movimentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="rounded-xl bg-gradient-card border border-border p-10 shadow-elegant flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando setores e veículos do pátio…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-6 shadow-elegant text-destructive">
          <p className="font-semibold mb-1">Falha ao carregar a gestão de localização</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {setores.map((setor) => {
              const ocupados = agrupadosPorSetor[setor.id].length;
              const pct = setor.capacidade > 0
                ? Math.min(100, Math.round((ocupados / setor.capacidade) * 100))
                : 0;
              const active = selectedSector === setor.id;

              return (
                <button
                  key={setor.id}
                  type="button"
                  onClick={() => handleSelectSector(setor.id)}
                  className={cn(
                    "rounded-xl bg-gradient-card border border-border p-5 shadow-elegant text-left transition-all hover:-translate-y-0.5 hover:border-gold-subtle",
                    active && setor.activeClassName,
                  )}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("h-10 w-10 shrink-0 rounded-lg flex items-center justify-center", setor.iconClassName)}>
                        <Warehouse className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{setor.id === "EXTERNO" ? "EXT" : setor.id}</p>
                        <h3 className="font-semibold text-sm truncate">{setor.nome}</h3>
                        <p className="text-[11px] text-muted-foreground truncate">{setor.descricao}</p>
                      </div>
                    </div>
                    {active && <ChevronRight className="h-4 w-4 text-gold shrink-0" />}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs gap-3">
                      <span className="text-muted-foreground">Veículos localizados</span>
                      <span className="font-semibold whitespace-nowrap">{ocupados} / {setor.capacidade}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full transition-all", setor.progressClassName)} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <p className="text-[11px] text-muted-foreground">{ocupados} veículo(s) mapeado(s)</p>
                      <span className={cn("text-[11px] font-semibold flex items-center gap-0.5", active ? "text-gold" : "text-muted-foreground")}>
                        Ver relação <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div ref={vehicleListRef} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] gap-4 mt-4 scroll-mt-4">
            <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
                <div>
                  <h3 className="font-semibold text-lg">Relação de veículos por setor</h3>
                  <p className="text-xs text-muted-foreground">
                    {setorSelecionado
                      ? `${setorSelecionado.nome} • ${veiculosDoSetor.length} veículo(s) encontrado(s)`
                      : "Selecione um setor acima para ver os veículos alocados nele."}
                  </p>
                </div>
                {setorSelecionado && (
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", setorSelecionado.badgeClassName)}>
                    {setorSelecionado.nome}
                  </span>
                )}
              </div>

              {!setorSelecionado ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 gap-2 text-center text-muted-foreground">
                  <MapPin className="h-10 w-10 opacity-40" />
                  <p className="font-medium text-foreground">Toque em um setor acima para abrir a relação</p>
                  <p className="text-sm max-w-md">A lista mostra placa, modelo, status e a vaga registrada para facilitar a localização física do veículo.</p>
                </div>
              ) : veiculosDoSetor.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 gap-2 text-center text-muted-foreground">
                  <Warehouse className="h-10 w-10 opacity-40" />
                  <p className="font-medium text-foreground">Nenhum veículo localizado neste setor</p>
                  <p className="text-sm max-w-md">Quando houver veículos com vaga cadastrada neste setor, a relação aparecerá aqui.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {veiculosDoSetor.map((veiculo) => (
                    <button
                      key={veiculo.id}
                      type="button"
                      onClick={() => navigate({ to: "/veiculos/$id", params: { id: veiculo.id } })}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono font-bold text-gold text-sm">{veiculo.placa}</span>
                          <StatusBadge status={veiculo.status as any} />
                        </div>
                        <p className="font-medium truncate">{veiculo.marca_modelo}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
                          <span>Vaga: <span className="font-mono text-foreground">{veiculo.local_vaga ?? "—"}</span></span>
                          <span>Delegacia: {veiculo.delegacia_nome ?? "—"}</span>
                          <span>Processo: {veiculo.processo ?? "—"}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
                <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gold" /> Vagas registradas
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {setorSelecionado
                    ? `Visualização rápida das vagas ocupadas no ${setorSelecionado.nome.toLowerCase()}.`
                    : "Selecione um setor para listar as vagas ocupadas registradas no sistema."}
                </p>

                {!setorSelecionado ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground text-center">
                    Nenhum setor selecionado.
                  </div>
                ) : veiculosDoSetor.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground text-center">
                    Não há vagas registradas neste setor.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {veiculosDoSetor.map((veiculo) => (
                      <button
                        key={`${veiculo.id}-vaga`}
                        type="button"
                        onClick={() => navigate({ to: "/veiculos/$id", params: { id: veiculo.id } })}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-left hover:border-gold/40 hover:bg-gold/10 transition-colors"
                        title={`${veiculo.placa} • ${veiculo.marca_modelo}`}
                      >
                        <div className="font-mono font-semibold text-sm">{veiculo.local_vaga ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{veiculo.placa}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
                <h3 className="font-semibold text-lg mb-1">Sem localização definida</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Estes veículos não entram na relação por setor porque ainda não possuem um setor explícito salvo nem uma localização legada que permita identificar A, B, C, D ou pátio externo.
                </p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{semLocalizacao.length}</p>
                    <p className="text-sm text-muted-foreground">veículo(s) precisam de localização mais precisa</p>
                  </div>
                  <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                    Campo principal: setor • fallback: local_vaga
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
