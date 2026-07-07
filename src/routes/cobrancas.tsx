import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Search, Plus, Loader2, Trash2, CheckCircle2, Circle, ReceiptText,
  Forklift, Truck, HardHat, CalendarDays,
  Download, FilePenLine, FileText, MessageCircle,
} from "lucide-react";
import {
  getVeiculos, getAllServicos, createServico, updateServico, deleteServico, calcDiasNoPatio, calcTotalServicos,
  type Veiculo, type Servico, type ServicoTipo,
} from "@/lib/db";
import { downloadPdfDocument, downloadWordDocument, shareDocumentViaWhatsApp, type ExportableDocument } from "@/lib/document-utils";

export const Route = createFileRoute("/cobrancas")({
  component: CobrancasPage,
  head: () => ({ meta: [{ title: "Cobranças — Pátio Legal" }] }),
});

const TIPO_INFO: Record<ServicoTipo, { label: string; unidade: string; IconEl: React.ElementType; cor: string }> = {
  diaria:       { label: "Diária de pátio",         unidade: "dias",  IconEl: CalendarDays, cor: "text-blue-500" },
  empilhadeira: { label: "Aluguel de empilhadeira",  unidade: "horas", IconEl: Forklift,    cor: "text-orange-500" },
  guincho:      { label: "Guincho / plataforma",     unidade: "horas", IconEl: Truck,       cor: "text-purple-500" },
  munck:        { label: "Munck / guindaste",        unidade: "horas", IconEl: HardHat,     cor: "text-green-600" },
};

const PATIO_OPTIONS = [
  { value: "A", label: "Setor A — Interno (início do barracão)" },
  { value: "B", label: "Setor B — Interno (meio do barracão)" },
  { value: "C", label: "Setor C — Interno (fundo do barracão)" },
  { value: "D", label: "Setor D — Peças / Outros" },
  { value: "EXTERNO", label: "Pátio Externo" },
  { value: "EXTERNO-1", label: "Setor Externo 1" },
  { value: "EXTERNO-2", label: "Setor Externo 2" },
  { value: "EXTERNO-3", label: "Setor Externo 3" },
  { value: "EXTERNO-4", label: "Setor Externo 4" },
  { value: "EXTERNO-5", label: "Setor Externo 5" },
  { value: "EXTERNO-6", label: "Setor Externo 6" },
] as const;

type ExtraServicoTipo = Exclude<ServicoTipo, "diaria">;
type ServicoResumo = Record<ServicoTipo, { quantidade: number; total: number; pendente: number; lancamentos: number }>;
type ServicoComVeiculo = Servico & { veiculos?: { placa: string; marca_modelo: string; delegacia_nome?: string } };
type ServicoResumoSource = Pick<Servico, "tipo" | "quantidade" | "valor_unitario" | "pago">;

const EXTRA_SERVICE_TYPES: ExtraServicoTipo[] = ["empilhadeira", "guincho", "munck"];

type ExtraServicoForm = {
  id: string;
  tipo: ExtraServicoTipo;
  quantidade: string;
  valor_unitario: string;
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function fmtDateTime(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function fmtQuantidade(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantidadeComUnidade(value: number, unidade: string) {
  const unidadeLabel = value === 1 ? unidade.replace(/s$/, "") : unidade;
  return `${fmtQuantidade(value)} ${unidadeLabel}`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function createServicoResumoBuckets(): ServicoResumo {
  return {
    diaria: { quantidade: 0, total: 0, pendente: 0, lancamentos: 0 },
    empilhadeira: { quantidade: 0, total: 0, pendente: 0, lancamentos: 0 },
    guincho: { quantidade: 0, total: 0, pendente: 0, lancamentos: 0 },
    munck: { quantidade: 0, total: 0, pendente: 0, lancamentos: 0 },
  };
}

function calcServicoTotal(servico: Pick<Servico, "quantidade" | "valor_unitario">) {
  return servico.quantidade * servico.valor_unitario;
}

function summarizeServicos(servicos: ServicoResumoSource[]): ServicoResumo {
  const resumo = createServicoResumoBuckets();

  servicos.forEach((servico) => {
    const totalItem = calcServicoTotal(servico);
    const bucket = resumo[servico.tipo];

    bucket.quantidade += servico.quantidade;
    bucket.total += totalItem;
    bucket.lancamentos += 1;

    if (!servico.pago) {
      bucket.pendente += totalItem;
    }
  });

  return resumo;
}

function createExtraServico(): ExtraServicoForm {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "empilhadeira",
    quantidade: "1",
    valor_unitario: "",
  };
}

function sanitizeDecimalInput(value: string, maxDecimals = 2) {
  const normalized = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [integerRaw = "", ...decimalParts] = normalized.split(",");
  const integer = integerRaw.replace(/^0+(?=\d)/, "");

  if (decimalParts.length === 0) {
    return integer;
  }

  const decimals = decimalParts.join("").slice(0, maxDecimals);
  return `${integer || "0"},${decimals}`;
}

function normalizeCurrencyInput(value: string) {
  const sanitized = sanitizeDecimalInput(value, 2);
  if (!sanitized) return "";

  const [integer = "0", decimals = ""] = sanitized.split(",");
  return `${integer},${decimals.padEnd(2, "0").slice(0, 2)}`;
}

function parsePtBrNumber(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuantidadeInput(value: string) {
  const sanitized = sanitizeDecimalInput(value, 2);
  if (!sanitized.includes(",")) {
    return sanitized;
  }

  const [integer = "0", decimals = ""] = sanitized.split(",");
  const trimmedDecimals = decimals.replace(/0+$/, "");
  return trimmedDecimals ? `${integer},${trimmedDecimals}` : integer;
}

function resolveDefaultPatioDescription(veiculo: Veiculo | null) {
  if (!veiculo) return "";

  const bySetor = PATIO_OPTIONS.find((option) => option.value === veiculo.setor)?.label;
  if (bySetor) return bySetor;

  return veiculo.local_vaga ?? "";
}

const EMPTY_FORM = {
  diaria_quantidade: "1",
  diaria_valor_unitario: "",
  diaria_descricao: "",
  extras: [] as ExtraServicoForm[],
  observacoes: "",
};

function CobrancasPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Veiculo | null>(null);
  const [allServicos, setAllServicos] = useState<ServicoComVeiculo[]>([]);
  const [loadingAllServicos, setLoadingAllServicos] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    getVeiculos()
      .then(data => { setVeiculos(data); if (data.length) setSelected(data[0]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getAllServicos()
      .then(setAllServicos)
      .catch(console.error)
      .finally(() => setLoadingAllServicos(false));
  }, []);

  // Services for the selected vehicle are derived from the already-loaded
  // getAllServicos() payload — no extra per-vehicle request. loadingServicos
  // tracks the initial full load only.
  const servicos = useMemo<Servico[]>(
    () => (selected ? allServicos.filter((servico) => servico.veiculo_id === selected.id) : []),
    [allServicos, selected?.id],
  );
  const loadingServicos = loadingAllServicos;

  const filtered = useMemo(() =>
    veiculos.filter(v => !query ||
      v.placa.toLowerCase().includes(query.toLowerCase()) ||
      v.marca_modelo.toLowerCase().includes(query.toLowerCase())),
    [veiculos, query]
  );

  const total = calcTotalServicos(servicos);
  const totalPago = calcTotalServicos(servicos.filter(s => s.pago));
  const totalPendente = total - totalPago;
  const servicosResumo = useMemo<ServicoResumo>(() => summarizeServicos(servicos), [servicos]);

  const diasNoPatio = selected ? calcDiasNoPatio(selected.created_at) : 0;
  const patioOptions = useMemo(() => {
    const options = [...PATIO_OPTIONS];

    if (selected?.local_vaga && !options.some((option) => option.label === selected.local_vaga)) {
      options.unshift({ value: "LOCAL_ATUAL", label: selected.local_vaga });
    }

    return options;
  }, [selected?.local_vaga]);

  const diariaTotal = parsePtBrNumber(form.diaria_quantidade) * parsePtBrNumber(form.diaria_valor_unitario);
  const extrasTotal = form.extras.reduce(
    (sum, extra) => sum + parsePtBrNumber(extra.quantidade) * parsePtBrNumber(extra.valor_unitario),
    0,
  );
  const totalDialogo = diariaTotal + extrasTotal;
  const temDiariaCompleta = parsePtBrNumber(form.diaria_quantidade) > 0 && parsePtBrNumber(form.diaria_valor_unitario) > 0;
  const temServicoExtra = form.extras.some(
    (extra) => parsePtBrNumber(extra.quantidade) > 0 && parsePtBrNumber(extra.valor_unitario) > 0,
  );
  const filteredVehicleIds = useMemo(() => new Set(filtered.map((veiculo) => veiculo.id)), [filtered]);
  const filteredServicos = useMemo(
    () => allServicos.filter((servico) => filteredVehicleIds.has(servico.veiculo_id)),
    [allServicos, filteredVehicleIds],
  );
  const filteredServicosByVehicle = useMemo(() => {
    const grouped = new Map<string, ServicoComVeiculo[]>();

    filteredServicos.forEach((servico) => {
      const current = grouped.get(servico.veiculo_id) ?? [];
      current.push(servico);
      grouped.set(servico.veiculo_id, current);
    });

    return grouped;
  }, [filteredServicos]);
  const cobrancaExportDocument = useMemo<ExportableDocument | null>(() => {
    if (!selected) return null;

    const issuedAt = fmtDateTime(new Date().toISOString());
    const serviceRows = servicos.length > 0
      ? servicos.map((servico) => {
        const info = TIPO_INFO[servico.tipo] ?? TIPO_INFO.diaria;
        return [
          servico.descricao || info.label,
          servico.pago ? "Pago" : "Em aberto",
          formatQuantidadeComUnidade(servico.quantidade, info.unidade),
          fmtBRL(servico.valor_unitario),
          fmtBRL(calcServicoTotal(servico)),
          fmt(servico.data_inicio),
        ];
      })
      : [["Nenhuma cobrança registrada", "—", "—", "—", "—", "—"]];

    const servicosExtrasIncluidos = EXTRA_SERVICE_TYPES.map((tipo) => {
      const resumo = servicosResumo[tipo];
      const info = TIPO_INFO[tipo];

      if (resumo.lancamentos === 0 || resumo.total === 0) {
        return `${info.label}: não incluído neste veículo.`;
      }

      return `${info.label}: ${fmtBRL(resumo.total)} em ${formatQuantidadeComUnidade(resumo.quantidade, info.unidade)}.${resumo.pendente > 0 ? ` Valor em aberto neste serviço: ${fmtBRL(resumo.pendente)}.` : " Serviço sem pendência."}`;
    });

    return {
      title: "RESUMO FINANCEIRO DE COBRANÇA",
      subtitle: "Pátio Legal Maringá SAT • Cobranças, diárias e serviços do veículo selecionado",
      filenameBase: slugify(`cobranca-${selected.placa}`),
      kind: "report",
      fields: {
        periodLabel: selected.placa,
        issuedAt,
      },
      meta: [
        { label: "Veículo", value: `${selected.placa} — ${selected.marca_modelo}` },
        { label: "Dias armazenados", value: `${diasNoPatio} dia(s)` },
        { label: "Valor total", value: fmtBRL(total) },
        { label: "Valor em aberto", value: fmtBRL(totalPendente) },
        { label: "Total das diárias", value: fmtBRL(servicosResumo.diaria.total) },
        { label: "Lançamentos", value: String(servicos.length) },
      ],
      sections: [
        {
          title: "RESUMO FINANCEIRO",
          paragraphs: [
            `O veículo ${selected.placa} (${selected.marca_modelo}) está armazenado desde ${fmt(selected.created_at)}, totalizando ${diasNoPatio} dia(s) no pátio.`,
            `Valor total cobrado: ${fmtBRL(total)}. Valor já pago: ${fmtBRL(totalPago)}. Valor em aberto: ${fmtBRL(totalPendente)}.`,
            servicosResumo.diaria.total > 0
              ? `Diárias lançadas: ${fmtBRL(servicosResumo.diaria.total)} em ${formatQuantidadeComUnidade(servicosResumo.diaria.quantidade, TIPO_INFO.diaria.unidade)}.${servicosResumo.diaria.pendente > 0 ? ` Diárias pendentes: ${fmtBRL(servicosResumo.diaria.pendente)}.` : " Diárias sem pendência."}`
              : "Ainda não há diária de pátio lançada para este veículo.",
          ],
        },
        {
          title: "SERVIÇOS ADICIONAIS",
          paragraphs: servicosExtrasIncluidos,
        },
      ],
      tables: [
        {
          title: `LANÇAMENTOS DE COBRANÇA (${servicos.length})`,
          headers: ["Serviço", "Status", "Quantidade", "Valor unit.", "Total", "Data"],
          rows: serviceRows,
        },
      ],
      footer: [
        `Documento emitido em ${issuedAt}.`,
        totalPendente > 0 ? `Total pendente atual: ${fmtBRL(totalPendente)}.` : "Sem valores em aberto.",
        "Pátio Legal Maringá SAT",
      ],
    };
  }, [diasNoPatio, selected, servicos, servicosResumo, total, totalPago, totalPendente]);
  const cobrancasFilteredExportDocument = useMemo<ExportableDocument | null>(() => {
    if (filtered.length === 0) return null;

    const issuedAt = fmtDateTime(new Date().toISOString());
    const queryLabel = query.trim() || "Sem termo de busca";
    const totalCobrado = filteredServicos.reduce((sum, servico) => sum + calcServicoTotal(servico), 0);
    const totalPagoFiltrado = filteredServicos.reduce((sum, servico) => sum + (servico.pago ? calcServicoTotal(servico) : 0), 0);
    const totalPendenteFiltrado = totalCobrado - totalPagoFiltrado;
    const resumoFiltrado = summarizeServicos(filteredServicos);
    const veiculosComCobranca = filtered.filter((veiculo) => (filteredServicosByVehicle.get(veiculo.id)?.length ?? 0) > 0).length;
    const veiculosSemCobranca = filtered.length - veiculosComCobranca;

    const summaryRows = filtered.map((veiculo) => {
      const vehicleServicos = filteredServicosByVehicle.get(veiculo.id) ?? [];
      const vehicleResumo = summarizeServicos(vehicleServicos);
      const vehicleTotal = vehicleServicos.reduce((sum, servico) => sum + calcServicoTotal(servico), 0);
      const vehiclePendente = vehicleServicos.reduce((sum, servico) => sum + (servico.pago ? 0 : calcServicoTotal(servico)), 0);

      return [
        veiculo.placa,
        veiculo.marca_modelo,
        `${calcDiasNoPatio(veiculo.created_at)} dia(s)`,
        fmtBRL(vehicleResumo.diaria.total),
        fmtBRL(vehicleResumo.empilhadeira.total),
        fmtBRL(vehicleResumo.guincho.total),
        fmtBRL(vehicleResumo.munck.total),
        fmtBRL(vehicleTotal),
        fmtBRL(vehiclePendente),
      ];
    });

    const detailRows = filteredServicos.length > 0
      ? filteredServicos.map((servico) => {
        const info = TIPO_INFO[servico.tipo] ?? TIPO_INFO.diaria;
        return [
          servico.veiculos?.placa ?? "—",
          servico.veiculos?.marca_modelo ?? "—",
          servico.descricao || info.label,
          servico.pago ? "Pago" : "Em aberto",
          formatQuantidadeComUnidade(servico.quantidade, info.unidade),
          fmtBRL(servico.valor_unitario),
          fmtBRL(calcServicoTotal(servico)),
          fmt(servico.data_inicio),
        ];
      })
      : [["Nenhuma cobrança encontrada", "—", "—", "—", "—", "—", "—", "—"]];

    return {
      title: "RELATÓRIO CONSOLIDADO DE COBRANÇAS",
      subtitle: "Pátio Legal Maringá SAT • Lote das cobranças visíveis na tela",
      filenameBase: slugify(`cobrancas-lote-${query.trim() || "todos"}`),
      kind: "report",
      fields: {
        periodLabel: queryLabel,
        issuedAt,
      },
      meta: [
        { label: "Busca aplicada", value: queryLabel },
        { label: "Veículos filtrados", value: String(filtered.length) },
        { label: "Veículos com cobrança", value: String(veiculosComCobranca) },
        { label: "Veículos sem cobrança", value: String(veiculosSemCobranca) },
        { label: "Total consolidado", value: fmtBRL(totalCobrado) },
        { label: "Valor em aberto", value: fmtBRL(totalPendenteFiltrado) },
      ],
      sections: [
        {
          title: "VISÃO GERAL DO LOTE",
          paragraphs: [
            `Esta exportação consolida ${filtered.length} veículo(s) exibido(s) atualmente na tela de Cobranças e Serviços.${query.trim() ? ` Busca aplicada: ${query.trim()}.` : ""}`,
            `Total cobrado no lote: ${fmtBRL(totalCobrado)}. Total pago: ${fmtBRL(totalPagoFiltrado)}. Total em aberto: ${fmtBRL(totalPendenteFiltrado)}.`,
            `Veículos com cobrança registrada: ${veiculosComCobranca}. Veículos ainda sem lançamento: ${veiculosSemCobranca}.`,
          ],
        },
        {
          title: "COMPOSIÇÃO DOS SERVIÇOS",
          paragraphs: [
            resumoFiltrado.diaria.total > 0
              ? `Diárias consolidadas: ${fmtBRL(resumoFiltrado.diaria.total)} em ${formatQuantidadeComUnidade(resumoFiltrado.diaria.quantidade, TIPO_INFO.diaria.unidade)}.`
              : "Sem diárias registradas neste lote.",
            EXTRA_SERVICE_TYPES.map((tipo) => {
              const resumo = resumoFiltrado[tipo];
              const info = TIPO_INFO[tipo];
              return resumo.total > 0
                ? `${info.label}: ${fmtBRL(resumo.total)} em ${formatQuantidadeComUnidade(resumo.quantidade, info.unidade)}.${resumo.pendente > 0 ? ` Em aberto: ${fmtBRL(resumo.pendente)}.` : ""}`
                : `${info.label}: não incluído neste lote.`;
            }).join(" "),
          ],
        },
      ],
      tables: [
        {
          title: `RESUMO POR VEÍCULO (${filtered.length})`,
          headers: ["Placa", "Veículo", "Dias no pátio", "Diárias", "Empilhadeira", "Guincho", "Munck", "Total", "Em aberto"],
          rows: summaryRows,
        },
        {
          title: `LANÇAMENTOS FILTRADOS (${filteredServicos.length})`,
          headers: ["Placa", "Veículo", "Serviço", "Status", "Quantidade", "Valor unit.", "Total", "Data"],
          rows: detailRows,
        },
      ],
      footer: [
        `Documento emitido em ${issuedAt}.`,
        query.trim() ? `Filtro atual da tela: ${query.trim()}.` : "Filtro atual da tela: todos os veículos visíveis.",
        "Pátio Legal Maringá SAT",
      ],
    };
  }, [filtered, filteredServicos, filteredServicosByVehicle, query]);

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      diaria_quantidade: String(diasNoPatio),
      diaria_descricao: resolveDefaultPatioDescription(selected),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;

    const payloads: Array<Omit<Servico, "id" | "created_at" | "updated_at">> = [];
    const diariaQuantidade = parsePtBrNumber(form.diaria_quantidade);
    const diariaValor = parsePtBrNumber(form.diaria_valor_unitario);

    if (diariaQuantidade > 0 && diariaValor > 0) {
      payloads.push({
        veiculo_id: selected.id,
        tipo: "diaria",
        descricao: form.diaria_descricao || TIPO_INFO.diaria.label,
        quantidade: diariaQuantidade,
        valor_unitario: diariaValor,
        observacoes: form.observacoes,
        data_inicio: new Date().toISOString(),
        pago: false,
      });
    }

    form.extras.forEach((extra) => {
      const quantidade = parsePtBrNumber(extra.quantidade);
      const valor = parsePtBrNumber(extra.valor_unitario);

      if (quantidade > 0 && valor > 0) {
        payloads.push({
          veiculo_id: selected.id,
          tipo: extra.tipo,
          descricao: TIPO_INFO[extra.tipo].label,
          quantidade,
          valor_unitario: valor,
          observacoes: form.observacoes,
          data_inicio: new Date().toISOString(),
          pago: false,
        });
      }
    });

    if (payloads.length === 0) return;

    setSaving(true);
    try {
      const novos = await Promise.all(payloads.map((payload) => createServico(payload)));
      setAllServicos(prev => [
        ...novos.map((servico) => ({
          ...servico,
          veiculos: selected ? {
            placa: selected.placa,
            marca_modelo: selected.marca_modelo,
            delegacia_nome: selected.delegacia_nome,
          } : undefined,
        })).reverse(),
        ...prev,
      ]);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleTogglePago = async (s: Servico) => {
    try {
      const updated = await updateServico(s.id, { pago: !s.pago });
      setAllServicos(prev => prev.map((item) => item.id === s.id ? { ...item, ...updated } : item));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteServico(id);
      setAllServicos(prev => prev.filter((servico) => servico.id !== id));
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Controle financeiro"
        title="Cobranças e Serviços"
        description="Diárias de pátio, aluguel de empilhadeira, guincho e munck — tudo por hora ou diária."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-border" disabled={(!cobrancaExportDocument && !cobrancasFilteredExportDocument) || loadingServicos || loadingAllServicos}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{selected ? `Veículo selecionado: ${selected.placa}` : "Selecione um veículo"}</DropdownMenuLabel>
              <DropdownMenuItem disabled={!cobrancaExportDocument || loadingServicos} onClick={() => cobrancaExportDocument && void downloadPdfDocument(cobrancaExportDocument)}>
                <FileText className="h-4 w-4" /> Exportar resumo em PDF
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!cobrancaExportDocument || loadingServicos} onClick={() => cobrancaExportDocument && void downloadWordDocument(cobrancaExportDocument)}>
                <FilePenLine className="h-4 w-4" /> Exportar resumo em Word
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!cobrancaExportDocument || loadingServicos} onClick={() => cobrancaExportDocument && void shareDocumentViaWhatsApp(cobrancaExportDocument, "pdf")}>
                <MessageCircle className="h-4 w-4" /> Enviar resumo em PDF por WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!cobrancaExportDocument || loadingServicos} onClick={() => cobrancaExportDocument && void shareDocumentViaWhatsApp(cobrancaExportDocument, "word")}>
                <MessageCircle className="h-4 w-4" /> Enviar resumo em Word por WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Lote filtrado na tela ({filtered.length})</DropdownMenuLabel>
              <DropdownMenuItem disabled={!cobrancasFilteredExportDocument || loadingAllServicos} onClick={() => cobrancasFilteredExportDocument && void downloadPdfDocument(cobrancasFilteredExportDocument)}>
                <FileText className="h-4 w-4" /> Exportar lote filtrado em PDF
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!cobrancasFilteredExportDocument || loadingAllServicos} onClick={() => cobrancasFilteredExportDocument && void downloadWordDocument(cobrancasFilteredExportDocument)}>
                <FilePenLine className="h-4 w-4" /> Exportar lote filtrado em Word
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!cobrancasFilteredExportDocument || loadingAllServicos} onClick={() => cobrancasFilteredExportDocument && void shareDocumentViaWhatsApp(cobrancasFilteredExportDocument, "pdf")}>
                <MessageCircle className="h-4 w-4" /> Enviar lote filtrado em PDF por WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!cobrancasFilteredExportDocument || loadingAllServicos} onClick={() => cobrancasFilteredExportDocument && void shareDocumentViaWhatsApp(cobrancasFilteredExportDocument, "word")}>
                <MessageCircle className="h-4 w-4" /> Enviar lote filtrado em Word por WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
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
                  <p className="text-xs text-muted-foreground">{calcDiasNoPatio(v.created_at)} dias no pátio</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum veículo encontrado.</p>
              )}
            </div>
          )}
        </div>

        {/* Charges detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
              <ReceiptText className="h-10 w-10 opacity-20" />
              <p>Selecione um veículo</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total cobrado", value: fmtBRL(total), cls: "text-foreground" },
                  { label: "Total pago",    value: fmtBRL(totalPago),     cls: "text-green-600" },
                  { label: "Pendente",      value: fmtBRL(totalPendente), cls: "text-amber-600" },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                    <p className={`font-bold text-lg ${c.cls}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Vehicle info + add button */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="font-bold">{selected.placa} — {selected.marca_modelo}</p>
                  <p className="text-sm text-muted-foreground">
                    Entrada: {fmt(selected.created_at)} · <strong>{diasNoPatio} dias</strong> no pátio
                  </p>
                </div>
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar cobrança
                </Button>
              </div>

              {/* Services table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loadingServicos ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /><span>Carregando cobranças…</span>
                  </div>
                ) : servicos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <ReceiptText className="h-8 w-8 opacity-20" />
                    <p className="text-sm">Nenhuma cobrança registrada.</p>
                    <p className="text-xs">Clique em "Adicionar cobrança" para incluir diárias ou serviços.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                      <span>Serviço</span>
                      <span className="text-right w-20">Qtd.</span>
                      <span className="text-right w-24">Vlr unit.</span>
                      <span className="text-right w-24">Total</span>
                      <span className="text-right w-20">Ações</span>
                    </div>
                    {servicos.map(s => {
                      const info = TIPO_INFO[s.tipo] ?? TIPO_INFO.diaria;
                      const Icon = info.IconEl;
                      return (
                        <div key={s.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center ${s.pago ? "opacity-60" : ""}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className={`h-4 w-4 shrink-0 ${info.cor}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{s.descricao || info.label}</p>
                              <p className="text-xs text-muted-foreground">{fmt(s.data_inicio)}</p>
                            </div>
                          </div>
                          <span className="text-sm text-right w-20">
                            {s.quantidade} {info.unidade}
                          </span>
                          <span className="text-sm text-right w-24">{fmtBRL(s.valor_unitario)}/{info.unidade.replace("s","")}</span>
                          <span className="text-sm font-semibold text-right w-24">{fmtBRL(s.quantidade * s.valor_unitario)}</span>
                          <div className="flex items-center gap-1 justify-end w-20">
                            <button
                              onClick={() => handleTogglePago(s)}
                              title={s.pago ? "Marcar como pendente" : "Marcar como pago"}
                              className="p-1 rounded hover:bg-muted transition-colors"
                            >
                              {s.pago
                                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                : <Circle className="h-4 w-4 text-muted-foreground" />
                              }
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              disabled={deleting === s.id}
                              className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                            >
                              {deleting === s.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />
                              }
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add service dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold">Diária de pátio</p>
                  <p className="text-xs text-muted-foreground">Preencha os dias no pátio e o valor diário. Valores inteiros são fechados como ,00 ao sair do campo.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantidade (dias)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="1"
                    value={form.diaria_quantidade}
                    onChange={e => setForm(f => ({ ...f, diaria_quantidade: sanitizeDecimalInput(e.target.value) }))}
                    onBlur={e => setForm(f => ({ ...f, diaria_quantidade: normalizeQuantidadeInput(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor por dia (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.diaria_valor_unitario}
                    onChange={e => setForm(f => ({ ...f, diaria_valor_unitario: sanitizeDecimalInput(e.target.value) }))}
                    onBlur={e => setForm(f => ({ ...f, diaria_valor_unitario: normalizeCurrencyInput(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Pátio / descrição da diária</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, diaria_descricao: "" }))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      !form.diaria_descricao
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Sem descrição específica
                  </button>
                  {patioOptions.map((option) => (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, diaria_descricao: option.label }))}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        form.diaria_descricao === option.label
                          ? "border-gold bg-gold/10 text-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Serviços extras</p>
                  <p className="text-xs text-muted-foreground">Empilhadeira, guincho ou munck somando junto com as diárias.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm(f => ({ ...f, extras: [...f.extras, createExtraServico()] }))}
                >
                  <Plus className="h-4 w-4" /> Adicionar serviço
                </Button>
              </div>

              {form.extras.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum serviço extra adicionado neste lançamento.</p>
              ) : form.extras.map((extra, index) => (
                <div key={extra.id} className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-[1.2fr_0.8fr_1fr_auto] md:items-end">
                  <div className="space-y-1.5">
                    <Label>Serviço extra #{index + 1}</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(Object.entries(TIPO_INFO) as [ServicoTipo, typeof TIPO_INFO[ServicoTipo]][])
                        .filter(([key]) => key !== "diaria")
                        .map(([key, info]) => {
                          const Icon = info.IconEl;
                          const active = extra.tipo === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setForm(f => ({
                                ...f,
                                extras: f.extras.map((item) => item.id === extra.id ? { ...item, tipo: key as ExtraServicoTipo } : item),
                              }))}
                              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                active
                                  ? "border-gold bg-gold/10 text-foreground"
                                  : "border-border bg-background text-muted-foreground"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${info.cor}`} />
                                {info.label}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Quantidade (horas)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="1"
                      value={extra.quantidade}
                      onChange={e => setForm(f => ({
                        ...f,
                        extras: f.extras.map((item) => item.id === extra.id ? { ...item, quantidade: sanitizeDecimalInput(e.target.value) } : item),
                      }))}
                      onBlur={e => setForm(f => ({
                        ...f,
                        extras: f.extras.map((item) => item.id === extra.id ? { ...item, quantidade: normalizeQuantidadeInput(e.target.value) } : item),
                      }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={extra.valor_unitario}
                      onChange={e => setForm(f => ({
                        ...f,
                        extras: f.extras.map((item) => item.id === extra.id ? { ...item, valor_unitario: sanitizeDecimalInput(e.target.value) } : item),
                      }))}
                      onBlur={e => setForm(f => ({
                        ...f,
                        extras: f.extras.map((item) => item.id === extra.id ? { ...item, valor_unitario: normalizeCurrencyInput(e.target.value) } : item),
                      }))}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setForm(f => ({ ...f, extras: f.extras.filter((item) => item.id !== extra.id) }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {totalDialogo > 0 && (
              <div className="rounded-lg bg-gold/10 border border-gold/30 px-4 py-3 space-y-1 text-sm font-semibold text-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Total das diárias</span>
                  <span>{fmtBRL(diariaTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Total dos extras</span>
                  <span>{fmtBRL(extrasTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-gold/30 pt-2 text-base">
                  <span>Total geral</span>
                  <span>{fmtBRL(totalDialogo)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Informações adicionais…"
                rows={2}
                className="resize-none"
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || (!temDiariaCompleta && !temServicoExtra)} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
