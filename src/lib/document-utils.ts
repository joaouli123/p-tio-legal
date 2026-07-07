import logoMaringaSat from "@/assets/logo-maringa-sat.jpg";
import reportHeaderLogo from "../../logo cabecario.jpeg";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createLaudoDocxBlob } from "@/lib/laudo-docx";
import { createLaudoPdfBlob } from "@/lib/laudo-pdf";
import type { Objeto, Veiculo } from "@/lib/db";
import { PLATE_STATUS_LABELS, resolvePlateStatus } from "@/lib/plate-status";
import { DEFAULT_PUBLIC_URL } from "@/lib/public-url";

export interface DocumentMetaItem {
  label: string;
  value: string;
}

export interface DocumentSection {
  title?: string;
  paragraphs: string[];
}

export interface LaudoFoto {
  url: string;
  label: string;
}

export interface ExportableDocument {
  title: string;
  subtitle: string;
  filenameBase: string;
  meta: DocumentMetaItem[];
  sections: DocumentSection[];
  footer: string[];
  kind?: "default" | "laudo" | "report";
  fields?: Record<string, string>;
  fotos?: LaudoFoto[];
  // Optional identification rows for the laudo. When present, the laudo
  // builders render these [label, value] pairs instead of the default
  // vehicle-only rows — used for the "objeto apreendido" laudo variant.
  identificationRows?: Array<[string, string]>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>;
}

interface LaudoOptions {
  veiculo: Veiculo;
  laudoNumber: string;
  metodo: string;
  destructionDate?: string;
  oficioNumber?: string;
  processoNumber?: string;
  fotos?: LaudoFoto[];
  hash?: string;
}

interface LaudoObjetoOptions {
  objeto: Objeto;
  laudoNumber: string;
  metodo: string;
  destructionDate?: string;
  oficioNumber?: string;
  processoNumber?: string;
  fotos?: LaudoFoto[];
  hash?: string;
}

interface VehicleSummaryOptions {
  veiculo: Veiculo;
}

interface ManagementReportOptions {
  periodLabel: string;
  cards: Array<{ label: string; value: string }>;
  monthly: Array<{ mes: string; entradas: number; destruidos: number; restituidos: number }>;
  delegacias: Array<{ n: string; v: number }>;
  tipos: Array<{ n: string; v: number }>;
  cobrancasSummary?: string[];
  tiposCobranca?: Array<{ n: string; v: string }>;
  vehicleList?: Veiculo[];
  laudosList?: Array<{ numero: string; placa: string; emitido_em: string }>;
}

interface ListExportDocumentOptions {
  title: string;
  subtitle: string;
  filenameLabel: string;
  meta: DocumentMetaItem[];
  paragraphs: string[];
  headers: string[];
  rows: string[][];
  tableTitle?: string;
}

const COMPANY_NAME = "PÁTIO LEGAL MARINGÁ SAT";
const COMPANY_FULL_NAME = "MARINGÁ SAT – PRESTADORA DE SERVIÇOS EM VEÍCULOS LTDA";
const DESTINATION_ADDRESS = "Avenida Paranavaí, 1489, cruzamento com a PR-317, Parque das Laranjeiras, Maringá/PR";
const VEHICLE_STATUS_LABELS: Record<string, string> = {
  no_patio: "No pátio",
  em_analise: "Em análise",
  destruido: "Destruído",
  restituido: "Restituído",
  leilao: "Leilão",
  doacao: "Destinação",
  aguardando: "Aguardando",
};

// Used for laudo letterhead — the formal document logo from the model
const LAUDO_LOGO_SRC = logoMaringaSat;
const REPORT_HEADER_LOGO_SRC = reportHeaderLogo;

function getLaudoLogoUrl() {
  return typeof window !== "undefined"
    ? new URL(LAUDO_LOGO_SRC as string, window.location.href).href
    : (LAUDO_LOGO_SRC as string);
}

function getReportHeaderLogoUrl() {
  return typeof window !== "undefined"
    ? new URL(REPORT_HEADER_LOGO_SRC as string, window.location.href).href
    : (REPORT_HEADER_LOGO_SRC as string);
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatLongDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getField(doc: ExportableDocument, key: string, fallback = "—") {
  return doc.fields?.[key] ?? fallback;
}

function cleanImageUrl(value?: string) {
  return (value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function inferImageFormat(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+)/);
  const raw = match?.[1]?.toLowerCase() ?? "jpeg";
  if (raw.includes("png")) return "PNG";
  return "JPEG";
}

async function fetchImageDataUrl(url?: string) {
  const normalizedUrl = cleanImageUrl(url);
  if (!normalizedUrl) return null;

  try {
    const response = await fetch(normalizedUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildBrandedHeaderMarkup(doc: ExportableDocument) {
  const issueLine = doc.kind === "report"
    ? `Emitido em ${escapeHtml(getField(doc, "issuedAt", formatDateTime()))}`
    : escapeHtml(doc.subtitle);

  return `
    <div class="brand-banner">
      <img src="${getReportHeaderLogoUrl()}" alt="Pátio Legal Maringá SAT" />
    </div>
    <div class="title-block">
      <p class="eyebrow">Pátio Legal Maringá SAT</p>
      <h1>${escapeHtml(doc.title)}</h1>
      <p class="subtitle">${escapeHtml(doc.subtitle)}</p>
      <p class="issue-line">${issueLine}</p>
    </div>
  `;
}

export function formatVehicleStatusLabel(status?: string | null) {
  if (!status) return "—";
  return VEHICLE_STATUS_LABELS[status] ?? status;
}

function buildVerificationUrl(laudoNumber: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : DEFAULT_PUBLIC_URL;
  return `${origin}/laudos?numero=${encodeURIComponent(laudoNumber)}`;
}

function buildQrCodeImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(value)}`;
}

/**
 * SHA-256 of the canonical laudo content, computed at emission time. The canonical
 * string is a stable, ordered projection of the identifying fields so the same
 * laudo always hashes to the same value — used as an anti-fraud/integrity seal
 * shown in the document and verification page.
 */
export async function computeSha256Hex(canonicalContent: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalContent);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function buildVeiculoLaudoCanonicalContent(input: {
  laudoNumber: string;
  veiculo: Veiculo;
  metodo: string;
  destructionMoment: string;
  oficio: string;
  processo: string;
}): string {
  const { laudoNumber, veiculo, metodo, destructionMoment, oficio, processo } = input;
  return [
    `LAUDO=${laudoNumber}`,
    `PLACA=${veiculo.placa}`,
    `CHASSI=${veiculo.chassi ?? ''}`,
    `MARCA_MODELO=${veiculo.marca_modelo}`,
    `ANO=${veiculo.ano ?? ''}`,
    `COR=${veiculo.cor ?? ''}`,
    `DELEGACIA=${veiculo.delegacia_nome ?? ''}`,
    `PROCESSO=${processo}`,
    `OFICIO=${oficio}`,
    `METODO=${metodo}`,
    `EMITIDO_EM=${destructionMoment}`,
  ].join('|');
}

export function buildObjetoLaudoCanonicalContent(input: {
  laudoNumber: string;
  objeto: Objeto;
  metodo: string;
  destructionMoment: string;
  oficio: string;
  processo: string;
}): string {
  const { laudoNumber, objeto, metodo, destructionMoment, oficio, processo } = input;
  return [
    `LAUDO=${laudoNumber}`,
    `DESCRICAO=${objeto.descricao}`,
    `MARCA_MODELO=${objeto.marca_modelo ?? ''}`,
    `SERIE=${objeto.numero_serie ?? ''}`,
    `QUANTIDADE=${objeto.quantidade} ${objeto.unidade}`,
    `ORIGEM=${objeto.origem ?? ''}`,
    `DELEGACIA=${objeto.delegacia_nome ?? ''}`,
    `PROCESSO=${processo}`,
    `OFICIO=${oficio}`,
    `METODO=${metodo}`,
    `EMITIDO_EM=${destructionMoment}`,
  ].join('|');
}

function formatHashForDisplay(hash?: string) {
  if (!hash) return '';
  return hash.toUpperCase();
}

export function buildLaudoDocument({
  veiculo,
  laudoNumber,
  metodo,
  destructionDate,
  oficioNumber,
  processoNumber,
  fotos,
  hash,
}: LaudoOptions): ExportableDocument {
  const destructionMoment = destructionDate ?? new Date().toISOString();
  const oficio = oficioNumber ?? "[INFORMAR OFÍCIO REQUISITANTE]";
  const processo = processoNumber ?? veiculo.processo ?? "[INFORMAR NÚMERO DO PROCESSO/INQUÉRITO]";
  const verificationUrl = buildVerificationUrl(laudoNumber);
  const tipoBem = veiculo.tipo === "motocicleta"
    ? "Motocicleta"
    : veiculo.tipo === "caminhao"
      ? "Caminhão"
      : veiculo.tipo === "automovel"
        ? "Automóvel"
        : "Veículo";

  return {
    title: "LAUDO DE DESTRUIÇÃO DE VEÍCULO",
    subtitle: `${COMPANY_FULL_NAME} • Laudo oficial de destruição`,
    filenameBase: sanitizeFilename(`laudo-${laudoNumber}-${veiculo.placa}`),
    kind: "laudo",
    fields: {
      laudoNumber,
      oficio,
      processo,
      processoAdministrativo: processo,
      varaComarca: "Comarca de Maringá/PR",
      tipoBem,
      placa: veiculo.placa,
      marcaModelo: veiculo.marca_modelo,
      chassi: veiculo.chassi ?? "Não informado",
      cor: veiculo.cor ?? "Não informada",
      ano: veiculo.ano ?? "Não informado",
      renavam: "Não informado",
      delegacia: veiculo.delegacia_nome ?? "Não informada",
      localizacao: veiculo.local_vaga ?? "Não informada",
      metodo,
      destructionDate: formatDateTime(destructionMoment),
      destructionDateLong: formatLongDate(destructionMoment),
      qrCodeUrl: buildQrCodeImageUrl(verificationUrl),
      verificationUrl,
      ...(hash ? { hashSha256: formatHashForDisplay(hash) } : {}),
    },
    meta: [
      { label: "Nº do laudo", value: laudoNumber },
      { label: "Ofício requisitante", value: oficio },
      { label: "Processo / Inquérito", value: processo },
      { label: "Placa", value: veiculo.placa },
      { label: "Marca / Modelo", value: veiculo.marca_modelo },
      { label: "Tipo de bem", value: tipoBem },
      { label: "Delegacia", value: veiculo.delegacia_nome ?? "—" },
      { label: "Método de destruição", value: metodo },
      { label: "Data da destruição", value: formatDateTime(destructionMoment) },
      ...(hash ? [{ label: "Hash SHA-256", value: formatHashForDisplay(hash) }] : []),
    ],
    sections: [
      {
        title: "Identificação do bem",
        paragraphs: [
          `${tipoBem} ${veiculo.marca_modelo}, placa ${veiculo.placa}, chassi ${veiculo.chassi ?? "não informado"}, vinculado à delegacia ${veiculo.delegacia_nome ?? "não informada"}.`,
        ],
      },
      {
        title: "Procedimento executado",
        paragraphs: [
          `A destruição foi realizada em ${formatDateTime(destructionMoment)} pelo método ${metodo.toLowerCase()}, com registro fotográfico e documental mantido no sistema do pátio.`,
          `O procedimento ocorreu nas dependências da ${COMPANY_FULL_NAME}, em ${DESTINATION_ADDRESS}.`,
        ],
      },
      {
        title: "Declaração técnica",
        paragraphs: [
          "Certifica-se que o bem descrito foi efetivamente submetido ao processo de destruição e destinação ambientalmente adequada, preservando-se a rastreabilidade documental para fins de auditoria e conferência judicial.",
        ],
      },
    ],
    footer: [
      `Maringá/PR, ${formatLongDate(destructionMoment)}.`,
      "Responsável técnico / operador / representante legal",
      COMPANY_NAME,
    ],
    fotos: fotos ?? [],
  };
}

const OBJETO_TIPO_LABELS: Record<string, string> = {
  caca_niquel: "Máquina caça-níquel",
  outro: "Objeto apreendido",
};

export function formatObjetoTipoLabel(tipo?: string | null) {
  if (!tipo) return "Objeto apreendido";
  return OBJETO_TIPO_LABELS[tipo] ?? "Objeto apreendido";
}

export function buildLaudoObjetoDocument({
  objeto,
  laudoNumber,
  metodo,
  destructionDate,
  oficioNumber,
  processoNumber,
  fotos,
  hash,
}: LaudoObjetoOptions): ExportableDocument {
  const destructionMoment = destructionDate ?? new Date().toISOString();
  const oficio = oficioNumber ?? "[INFORMAR OFÍCIO REQUISITANTE]";
  const processo = processoNumber ?? objeto.processo ?? "[INFORMAR NÚMERO DO PROCESSO/INQUÉRITO]";
  const verificationUrl = buildVerificationUrl(laudoNumber);
  const tipoBem = formatObjetoTipoLabel(objeto.tipo);
  const quantidadeLabel = `${objeto.quantidade} ${objeto.unidade}`;
  const docTitle = "LAUDO DE DESTRUIÇÃO DE OBJETO APREENDIDO";

  const identificationRows: Array<[string, string]> = [
    ["Bem", tipoBem],
    ["Descrição", objeto.descricao],
    ["Marca/Modelo", objeto.marca_modelo ?? "Não informado"],
    ["Nº de série", objeto.numero_serie ?? "Não informado"],
    ["Quantidade", quantidadeLabel],
    ["Origem", objeto.origem ?? "Não informada"],
    ["Processo Administrativo", processo],
  ];

  return {
    title: docTitle,
    subtitle: `${COMPANY_FULL_NAME} • Laudo oficial de destruição`,
    filenameBase: sanitizeFilename(`laudo-${laudoNumber}-${objeto.descricao}`),
    kind: "laudo",
    fields: {
      docTitle,
      bemLabel: "objeto",
      laudoNumber,
      oficio,
      processo,
      processoAdministrativo: processo,
      varaComarca: "Comarca de Maringá/PR",
      tipoBem,
      descricao: objeto.descricao,
      marcaModelo: objeto.marca_modelo ?? "Não informado",
      numeroSerie: objeto.numero_serie ?? "Não informado",
      quantidade: quantidadeLabel,
      origem: objeto.origem ?? "Não informada",
      delegacia: objeto.delegacia_nome ?? "Não informada",
      localizacao: objeto.local_vaga ?? "Não informada",
      metodo,
      destructionDate: formatDateTime(destructionMoment),
      destructionDateLong: formatLongDate(destructionMoment),
      qrCodeUrl: buildQrCodeImageUrl(verificationUrl),
      verificationUrl,
      ...(hash ? { hashSha256: formatHashForDisplay(hash) } : {}),
    },
    identificationRows,
    meta: [
      { label: "Nº do laudo", value: laudoNumber },
      { label: "Ofício requisitante", value: oficio },
      { label: "Processo / Inquérito", value: processo },
      { label: "Descrição", value: objeto.descricao },
      { label: "Marca / Modelo", value: objeto.marca_modelo ?? "—" },
      { label: "Tipo de bem", value: tipoBem },
      { label: "Quantidade", value: quantidadeLabel },
      { label: "Delegacia", value: objeto.delegacia_nome ?? "—" },
      { label: "Método de destruição", value: metodo },
      { label: "Data da destruição", value: formatDateTime(destructionMoment) },
      ...(hash ? [{ label: "Hash SHA-256", value: formatHashForDisplay(hash) }] : []),
    ],
    sections: [
      {
        title: "Identificação do bem",
        paragraphs: [
          `${tipoBem} descrito como "${objeto.descricao}", quantidade ${quantidadeLabel}, ${objeto.numero_serie ? `nº de série ${objeto.numero_serie}, ` : ""}vinculado à delegacia ${objeto.delegacia_nome ?? "não informada"}.`,
        ],
      },
      {
        title: "Procedimento executado",
        paragraphs: [
          `A destruição foi realizada em ${formatDateTime(destructionMoment)} pelo método ${metodo.toLowerCase()}, com registro fotográfico e documental mantido no sistema do pátio.`,
          `O procedimento ocorreu nas dependências da ${COMPANY_FULL_NAME}, em ${DESTINATION_ADDRESS}.`,
        ],
      },
      {
        title: "Declaração técnica",
        paragraphs: [
          "Certifica-se que o bem descrito foi efetivamente submetido ao processo de destruição e destinação ambientalmente adequada, preservando-se a rastreabilidade documental para fins de auditoria e conferência judicial.",
        ],
      },
    ],
    footer: [
      `Maringá/PR, ${formatLongDate(destructionMoment)}.`,
      "Responsável técnico / operador / representante legal",
      COMPANY_NAME,
    ],
    fotos: fotos ?? [],
  };
}

export function buildVehicleSummaryDocument({ veiculo }: VehicleSummaryOptions): ExportableDocument {
  const plateStatus = resolvePlateStatus(veiculo);
  const officialPlate = veiculo.placa_oficial ?? veiculo.placa;
  const lookupSummary = [veiculo.marca_modelo_consulta, veiculo.ano_consulta, veiculo.cor_consulta, veiculo.tipo_consulta]
    .filter(Boolean)
    .join(', ');

  return {
    title: "CADASTRO RESUMIDO DO VEÍCULO",
    subtitle: `${COMPANY_NAME} • Resumo operacional para envio e conferência rápida`,
    filenameBase: sanitizeFilename(`cadastro-${veiculo.placa}`),
    kind: "default",
    meta: [
      { label: "Placa ostentada", value: veiculo.placa },
      { label: "Placa oficial / real", value: officialPlate },
      { label: "Status da placa", value: PLATE_STATUS_LABELS[plateStatus] },
      { label: "Chassi", value: veiculo.chassi ?? "—" },
      { label: "Marca / Modelo", value: veiculo.marca_modelo },
      { label: "Ano", value: veiculo.ano ?? "—" },
      { label: "Cor", value: veiculo.cor ?? "—" },
      { label: "Tipo", value: veiculo.tipo },
      { label: "Status", value: veiculo.status },
      { label: "Delegacia", value: veiculo.delegacia_nome ?? "—" },
      { label: "Processo / Inquérito", value: veiculo.processo ?? "—" },
      { label: "Localização no pátio", value: veiculo.local_vaga ?? "—" },
      { label: "Entrada no sistema", value: formatDateTime(veiculo.created_at) },
    ],
    sections: [
      {
        title: "IDENTIFICAÇÃO DO BEM",
        paragraphs: [
          `Bem apreendido identificado como ${veiculo.marca_modelo}, placa ostentada ${veiculo.placa}, tipo ${veiculo.tipo}, cor ${veiculo.cor ?? "não informada"}, ano ${veiculo.ano ?? "não informado"}.`,
          plateStatus === 'regular'
            ? `Consulta oficial sem divergência relevante, com referência para placa ${officialPlate}.`
            : `A referência oficial vinculada ao cadastro aponta a placa ${officialPlate} com status ${PLATE_STATUS_LABELS[plateStatus].toLowerCase()}.`,
          lookupSummary ? `Dados oficiais de referência: ${lookupSummary}.` : "",
        ],
      },
      {
        title: "VINCULAÇÃO PROCESSUAL",
        paragraphs: [
          `Veículo vinculado ao processo/inquérito ${veiculo.processo ?? "não informado"}, com origem registrada em ${veiculo.delegacia_nome ?? "delegacia não informada"}.`,
        ],
      },
      {
        title: "LOCALIZAÇÃO E OBSERVAÇÕES",
        paragraphs: [
          `Localização atual no pátio: ${veiculo.local_vaga ?? "não informada"}.`,
          veiculo.observacoes ? `Observações registradas: ${veiculo.observacoes}.` : "Observações registradas: nenhuma observação adicional cadastrada.",
        ],
      },
    ],
    footer: [
      `Documento emitido em ${formatDateTime(new Date().toISOString())}.`,
      COMPANY_NAME,
    ],
  };
}

export function buildManagementReportDocument({ periodLabel, cards, monthly, delegacias, tipos, cobrancasSummary = [], tiposCobranca = [], vehicleList, laudosList }: ManagementReportOptions): ExportableDocument {
  const issuedAt = formatDateTime(new Date().toISOString());

  const tables: ExportableDocument["tables"] = [];

  if (vehicleList && vehicleList.length > 0) {
    tables.push({
      title: `LISTAGEM DE VEÍCULOS (${vehicleList.length} registro(s))`,
      headers: ["Placa", "Marca / Modelo", "Ano", "Delegacia de Origem", "Status"],
      rows: vehicleList.map((v) => [
        v.placa,
        v.marca_modelo,
        v.ano ?? "—",
        v.delegacia_nome ?? "—",
        VEHICLE_STATUS_LABELS[v.status] ?? v.status,
      ]),
    });
  }

  if (laudosList && laudosList.length > 0) {
    tables.push({
      title: `LAUDOS DE DESTRUIÇÃO EMITIDOS (${laudosList.length})`,
      headers: ["Nº do Laudo", "Placa", "Data de Emissão"],
      rows: laudosList.map((l) => [l.numero, l.placa, formatDateTime(l.emitido_em)]),
    });
  }

  return {
    title: "RELATÓRIO GERENCIAL DO PÁTIO",
    subtitle: `${COMPANY_NAME} • Consolidação executiva para compartilhamento em PDF`,
    filenameBase: sanitizeFilename(`relatorio-gerencial-${periodLabel}`),
    kind: "report",
    fields: {
      periodLabel,
      issuedAt,
    },
    meta: cards.map((card) => ({ label: card.label, value: card.value })),
    sections: [
      {
        title: "PERÍODO ANALISADO",
        paragraphs: [`Resumo consolidado do período ${periodLabel}, com os indicadores operacionais do pátio e a distribuição das principais movimentações.`],
      },
      {
        title: "RESUMO MENSAL",
        paragraphs: monthly.map((item) => `${item.mes}: entradas ${item.entradas}, destruições ${item.destruidos}, restituições ${item.restituidos}.`),
      },
      {
        title: "POR DELEGACIA DE ORIGEM",
        paragraphs: delegacias.map((item) => `${item.n}: ${item.v} veículo(s).`),
      },
      {
        title: "POR TIPO DE BEM",
        paragraphs: tipos.map((item) => `${item.n}: ${item.v} registro(s).`),
      },
      ...(cobrancasSummary.length > 0 ? [{
        title: "COBRANÇAS E SERVIÇOS",
        paragraphs: cobrancasSummary,
      }] : []),
      ...(tiposCobranca.length > 0 ? [{
        title: "PRINCIPAIS TIPOS DE COBRANÇA",
        paragraphs: tiposCobranca.map((item) => `${item.n}: ${item.v}.`),
      }] : []),
    ],
    tables,
    footer: [
      `Relatório emitido em ${issuedAt}.`,
      COMPANY_NAME,
    ],
  };
}

export function buildListExportDocument({ title, subtitle, filenameLabel, meta, paragraphs, headers, rows, tableTitle }: ListExportDocumentOptions): ExportableDocument {
  const issuedAt = formatDateTime(new Date().toISOString());

  return {
    title,
    subtitle,
    filenameBase: sanitizeFilename(filenameLabel),
    kind: "report",
    fields: {
      periodLabel: title,
      issuedAt,
    },
    meta: [
      ...meta,
      { label: "Total de registros", value: String(rows.length) },
    ],
    sections: [
      {
        title: "ESCOPO DA EXPORTAÇÃO",
        paragraphs: paragraphs.filter(Boolean),
      },
    ],
    tables: [
      {
        title: tableTitle ?? `LISTAGEM COMPLETA (${rows.length} registro(s))`,
        headers,
        rows,
      },
    ],
    footer: [
      `Documento emitido em ${issuedAt}.`,
      COMPANY_NAME,
    ],
  };
}

async function createGenericPdfBlob(doc: ExportableDocument) {
  const isWide = (doc.tables ?? []).some((table) => table.headers.length > 6);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: isWide ? "landscape" : "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = isWide ? 28 : 40;
  const contentWidth = pageWidth - (margin * 2);
  const headerLogoData = await fetchImageDataUrl(getReportHeaderLogoUrl());
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  };

  const drawParagraph = (text: string, fontSize = 11, gap = 8) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(trimmed, contentWidth);
    ensureSpace((lines.length * (fontSize + 3)) + gap + 2);
    pdf.text(lines, margin, y);
    y += (lines.length * (fontSize + 3)) + gap;
  };

  const drawBrandedHeader = () => {
    const bannerHeight = isWide ? 96 : 108;
    const bannerRadius = 18;
    const logoWidth = Math.min(isWide ? 240 : 260, contentWidth - 64);
    const logoHeight = logoWidth / 2.53;

    pdf.setFillColor(6, 6, 6);
    pdf.roundedRect(margin, y, contentWidth, bannerHeight, bannerRadius, bannerRadius, "F");

    if (headerLogoData) {
      pdf.addImage(
        headerLogoData,
        inferImageFormat(headerLogoData),
        margin + ((contentWidth - logoWidth) / 2),
        y + ((bannerHeight - logoHeight) / 2),
        logoWidth,
        logoHeight,
      );
    } else {
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text(COMPANY_NAME, pageWidth / 2, y + (bannerHeight / 2) + 8, { align: "center" });
      pdf.setTextColor(0, 0, 0);
    }

    y += bannerHeight + 18;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(doc.kind === "report" ? 18 : 17);
    const titleLines = pdf.splitTextToSize(doc.title, contentWidth);
    pdf.text(titleLines, pageWidth / 2, y, { align: "center" });
    y += (titleLines.length * 20) + 4;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(98, 112, 132);
    const subtitleLines = pdf.splitTextToSize(doc.subtitle, contentWidth);
    pdf.text(subtitleLines, pageWidth / 2, y, { align: "center" });
    y += (subtitleLines.length * 13) + 3;

    const issueLine = doc.kind === "report"
      ? `Emitido em ${getField(doc, "issuedAt", formatDateTime())}`
      : doc.subtitle;
    const issueLines = pdf.splitTextToSize(issueLine, contentWidth);
    pdf.setFontSize(9.5);
    pdf.text(issueLines, pageWidth / 2, y, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    y += (issueLines.length * 12) + 18;
  };

  drawBrandedHeader();

  if (doc.meta.length > 0) {
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: isWide ? 8.5 : 9.5,
        cellPadding: 6,
        lineColor: [221, 213, 197],
        lineWidth: 0.8,
        textColor: [20, 38, 61],
      },
      bodyStyles: { valign: "middle" },
      columnStyles: {
        0: { cellWidth: isWide ? 150 : 130, fontStyle: "bold", fillColor: [249, 248, 245] },
        1: { cellWidth: contentWidth - (isWide ? 150 : 130) },
      },
      body: doc.meta.map((item) => [item.label, item.value]),
    });
    y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 16;
  }

  for (const section of doc.sections) {
    if (section.title) {
      ensureSpace(24);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(section.title, margin, y);
      y += 18;
    }

    section.paragraphs.filter(Boolean).forEach((paragraph) => drawParagraph(paragraph, 10.5, 8));
    y += 4;
  }

  for (const table of doc.tables ?? []) {
    ensureSpace(28);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(table.title, margin, y);
    y += 14;

    const tableFontSize = table.headers.length > 8 ? 7.5 : table.headers.length > 6 ? 8 : 9;
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      headStyles: {
        fillColor: [26, 53, 96],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: tableFontSize,
      },
      styles: {
        font: "helvetica",
        fontSize: tableFontSize,
        cellPadding: 5,
        lineColor: [221, 213, 197],
        lineWidth: 0.6,
        textColor: [36, 53, 73],
        overflow: "linebreak",
      },
      bodyStyles: { valign: "top" },
      head: [table.headers],
      body: table.rows,
    });
    y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;
  }

  if (doc.footer.length > 0) {
    ensureSpace((doc.footer.length * 14) + 12);
    pdf.setDrawColor(221, 213, 197);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 14;
    doc.footer.filter(Boolean).forEach((line) => drawParagraph(line, 9.5, 4));
  }

  return pdf.output("blob");
}

function buildDefaultMarkup(doc: ExportableDocument) {
  return `
    <style>
      body { margin: 0; background: #f5f2ea; }
      .doc-root { font-family: Arial, Helvetica, sans-serif; color: #14263d; padding: 32px; }
      .doc-shell { background: #ffffff; border: 1px solid #d8d2c3; border-radius: 18px; padding: 28px; box-shadow: 0 12px 30px rgba(16, 36, 62, 0.08); }
      .brand-banner { margin: -28px -28px 22px; padding: 16px 24px; background: #040404; border-radius: 18px 18px 0 0; display: flex; justify-content: center; }
      .brand-banner img { width: 100%; max-width: 420px; height: auto; display: block; object-fit: contain; }
      .title-block { text-align: center; margin-bottom: 22px; }
      .eyebrow { margin: 0 0 10px; font-size: 11px; color: #a8842b; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 700; }
      h1 { font-size: 22px; margin: 0 0 6px; }
      .subtitle { font-size: 12px; color: #6b7280; margin: 0 0 6px; }
      .issue-line { font-size: 11px; color: #7c8798; margin: 0 0 24px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; vertical-align: top; }
      td.label { width: 28%; background: #f3f4f6; color: #4b5563; font-weight: bold; text-transform: uppercase; }
      h2 { font-size: 14px; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: 0.08em; }
      p { font-size: 12px; line-height: 1.65; margin: 0 0 10px; text-align: justify; }
      .footer { margin-top: 28px; }
    </style>
    <div class="doc-root">
      <div class="doc-shell">
        ${buildBrandedHeaderMarkup(doc)}
        <table>
          <tbody>
            ${doc.meta.map((item) => `<tr><td class="label">${escapeHtml(item.label)}</td><td>${escapeHtml(item.value)}</td></tr>`).join("")}
          </tbody>
        </table>
        ${doc.sections.map((section) => `
          ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
          ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        `).join("")}
        <div class="footer">
          ${doc.footer.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function buildLaudoMarkup(doc: ExportableDocument) {
  const logoSrc = getLaudoLogoUrl();
  const docTitle = getField(doc, "docTitle", "LAUDO DE DESTRUIÇÃO DE VEÍCULO");
  const bemLabel = getField(doc, "bemLabel", "veículo");
  const defaultIdentificationRows: Array<[string, string]> = [
    ["Veículo", getField(doc, "tipoBem")],
    ["Marca/Modelo", getField(doc, "marcaModelo")],
    ["Placa", getField(doc, "placa")],
    ["Chassis", getField(doc, "chassi")],
    ["Cor", getField(doc, "cor")],
    ["Ano", getField(doc, "ano")],
    ["Renavam", getField(doc, "renavam")],
    ["Processo Administrativo", getField(doc, "processo")],
  ];
  const identificationRows = doc.identificationRows ?? defaultIdentificationRows;
  return `
    <style>
      body { margin: 0; padding: 0; background: #ffffff; }
      .laudo-doc { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000000; max-width: 820px; margin: 0 auto; padding: 36px 48px; background: #ffffff; }
      .letterhead { display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
      .letterhead img { width: 100%; max-width: 760px; height: auto; object-fit: contain; display: block; }
      .doc-title { font-size: 22pt; font-weight: bold; text-align: center; text-transform: uppercase; color: #000000; margin: 12px 0 24px; }
      .header-fields { margin-bottom: 18px; line-height: 1.75; }
      .header-row { margin-bottom: 6px; }
      .field-label { font-weight: bold; font-size: 11pt; }
      .field-value { font-size: 11pt; }
      .requisitada { margin: 6px 0 0; font-size: 11pt; }
      .section { margin-top: 16px; }
      .section-title { font-weight: bold; font-size: 11pt; margin-bottom: 8px; }
      .section p { font-size: 11pt; line-height: 1.65; text-align: justify; margin: 0 0 8px; }
      .vehicle-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; font-size: 11pt; }
      .vehicle-table th { width: 42%; background-color: #ffffff; color: #000000; border: 1px solid #444444; padding: 7px 8px; text-align: left; font-weight: normal; }
      .vehicle-table td { border: 1px solid #444444; padding: 7px 8px; text-align: left; vertical-align: middle; }
      .qr-row { display: flex; align-items: center; gap: 14px; margin-top: 8px; }
      .qr-row img { width: 80px; height: 80px; flex-shrink: 0; }
      .qr-text { font-size: 10pt; line-height: 1.5; word-break: break-all; }
      .signature-area { margin-top: 40px; }
      .city-date { font-size: 11pt; margin-bottom: 50px; }
      .signature-block { display: flex; justify-content: flex-end; }
      .signature-line { text-align: center; width: 300px; border-top: 1px solid #000000; padding-top: 6px; font-size: 11pt; }
      .signature-name { font-weight: bold; }
      .photos-section { margin-top: 20px; }
      .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px; }
      .photo-item { text-align: center; }
      .photo-item img { width: 100%; max-height: 200px; object-fit: cover; border: 1px solid #aaaaaa; border-radius: 4px; }
      .photo-caption { font-size: 9.5pt; color: #444444; margin-top: 4px; font-style: italic; }
      @media print { body { background: #fff; } .laudo-doc { padding: 0; } }
    </style>
    <div class="laudo-doc">
      <div class="letterhead">
        <img src="${logoSrc}" alt="Pátio Legal Maringá SAT" />
      </div>

      <div class="doc-title">${escapeHtml(docTitle)}</div>

      <div class="header-fields">
        <div class="header-row">
          <span class="field-label">LAUDO Nº: </span><span class="field-value">${escapeHtml(getField(doc, "laudoNumber"))}</span>
        </div>
        <div class="header-row">
          <span class="field-label">DATA/HORA: </span><span class="field-value">${escapeHtml(getField(doc, "destructionDate"))}</span>
        </div>
        <div class="header-row">
          <span class="field-label">OFÍCIO REQUISITANTE: </span><span class="field-value">Ofício nº ${escapeHtml(getField(doc, "oficio"))}</span>
        </div>
        <div class="header-row">
          <span class="field-label">PROCESSO Nº: </span><span class="field-value">${escapeHtml(getField(doc, "processo"))}</span>
        </div>
        <div class="requisitada">
          <span class="field-label">REQUISITADA: </span><span class="field-value">MARINGÁ SAT – PRESTADORA DE SERVIÇOS EM VEÍCULOS LTDA.</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">I. OBJETIVO</div>
        <p>Em cumprimento à determinação recebida por meio do Ofício nº ${escapeHtml(getField(doc, "oficio"))}, oriundo do juízo da ${escapeHtml(getField(doc, "varaComarca"))}, a empresa MARINGÁ SAT foi requisitada para proceder com a destruição do ${escapeHtml(bemLabel)} discriminado abaixo:</p>
        <table class="vehicle-table">
          <tbody>
            ${identificationRows.map(([label, value]) => `
            <tr>
              <th>${escapeHtml(label)}</th>
              <td>${escapeHtml(value)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">II. CONSIDERAÇÕES INICIAIS</div>
        <p>A presente destruição foi autorizada e determinada pela autoridade judicial competente, visando o cumprimento das normas legais aplicáveis à destinação de bens apreendidos.</p>
      </div>

      <div class="section">
        <div class="section-title">III. DA DESTRUIÇÃO</div>
        <p>Foram submetidas à destruição total as partes e componentes do ${escapeHtml(bemLabel)} acima identificado, conforme determinado pelo ofício supracitado.</p>
        <p>O procedimento compreendeu: descontaminação ambiental do veículo; remoção de resíduos e fluidos; descaracterização estrutural; inutilização dos elementos identificadores; separação técnica dos materiais recicláveis; e destinação final ambientalmente adequada da sucata.</p>
      </div>

      <div class="section">
        <div class="section-title">IV. REGISTRO FOTOGRÁFICO E DOCUMENTAL</div>
        <p>O procedimento de recolhimento, descontaminação, destruição e destinação do veículo foi devidamente registrado por meio de fotografias e documentos técnicos.</p>
        <p>O acesso ao arquivo digital poderá ser realizado através do QR Code correspondente.</p>
        <div class="qr-row">
          <img src="${escapeHtml(getField(doc, "qrCodeUrl", ""))}" alt="QR Code de verificação do laudo" />
          <div class="qr-text">
            <strong>Verificação digital do laudo:</strong><br />${escapeHtml(getField(doc, "verificationUrl"))}
            ${getField(doc, "hashSha256", "") ? `<br /><strong>Hash SHA-256:</strong><br /><span style="font-family:monospace;font-size:8pt;word-break:break-all;">${escapeHtml(getField(doc, "hashSha256"))}</span>` : ""}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">V. CONCLUSÃO</div>
        <p>Certifico que foram concluídas todas as operações de descontaminação, destruição e destinação das sucatas, conduzidas com rigoroso protocolo de segurança e controle.</p>
        <p>Todo o processo ocorreu em ambiente seguro e protegido, sob constante supervisão e na presença de testemunhas, garantindo assim a transparência do procedimento desde a retirada do bem até o encaminhamento final da sucata para reciclagem.</p>
        <p>O presente laudo foi redigido pelo representante legal da MARINGÁ SAT, Sr. Jardel F. Pinto, devidamente inscrito no CPF sob o nº 003.614.589-08.</p>
      </div>

      ${(doc.fotos && doc.fotos.length > 0) ? `
      <div class="section photos-section">
        <div class="section-title">VI. REGISTRO FOTOGRÁFICO</div>
        <div class="photos-grid">
          ${doc.fotos.map((foto) => `
            <div class="photo-item">
              <img src="${escapeHtml(foto.url)}" alt="${escapeHtml(foto.label)}" />
              <div class="photo-caption">${escapeHtml(foto.label)}</div>
            </div>
          `).join("")}
        </div>
      </div>
      ` : ""}

      <div class="signature-area">
        <div class="city-date">Maringá/PR, ${escapeHtml(getField(doc, "destructionDateLong"))}.</div>
        <div class="signature-block">
          <div class="signature-line">
            <div class="signature-name">Jardel F. Pinto</div>
            <div>Representante Técnico Nomeado</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildReportMarkup(doc: ExportableDocument) {
  return `
    <style>
      body { margin: 0; background: #f4efe5; }
      .doc-root { font-family: Arial, Helvetica, sans-serif; color: #14263d; padding: 24px; }
      .report-shell { background: #ffffff; border: 1px solid #d6cfbe; border-radius: 22px; padding: 28px; box-shadow: 0 16px 34px rgba(16, 36, 62, 0.08); }
      .brand-banner { margin: -28px -28px 22px; padding: 16px 24px; background: #040404; border-radius: 22px 22px 0 0; display: flex; justify-content: center; }
      .brand-banner img { width: 100%; max-width: 440px; height: auto; display: block; object-fit: contain; }
      .title-block { text-align: center; margin-bottom: 22px; }
      .eyebrow { margin: 0 0 10px; font-size: 11px; color: #a8842b; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700; }
      h1 { margin: 0 0 6px; font-size: 26px; }
      .subtitle { margin: 0 0 6px; color: #617084; font-size: 12px; }
      .issue-line { margin: 0; color: #7c8798; font-size: 11px; }
      .report-meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
      .meta-card { border: 1px solid #ddd5c5; border-radius: 16px; background: #fbfaf7; padding: 14px; }
      .meta-card .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
      .meta-card .value { margin-top: 6px; color: #10243e; font-size: 20px; font-weight: 700; }
      .sections { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
      .section-card { border: 1px solid #ddd5c5; border-radius: 18px; background: #fbfaf7; padding: 18px; }
      .section-card.full { grid-column: 1 / -1; }
      .section-card h2 { margin: 0 0 10px; color: #10243e; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
      .section-card p { margin: 0 0 10px; font-size: 12px; line-height: 1.7; color: #243549; }
      .data-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
      .data-table th { background: #1a3560; color: #ffffff; padding: 6px 8px; text-align: left; font-size: 11px; font-weight: 700; }
      .data-table td { border: 1px solid #ddd5c5; padding: 5px 8px; font-size: 11px; color: #243549; }
      .data-table tr:nth-child(even) td { background: #f9f8f5; }
      .footer { margin-top: 20px; color: #5b6676; font-size: 11px; }
      @media print {
        .doc-root { padding: 0; }
        .report-shell { box-shadow: none; border-radius: 0; border: 0; }
      }
      @media (max-width: 720px) {
        .sections { display: block; }
        .report-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .section-card { margin-bottom: 14px; }
      }
    </style>
    <div class="doc-root">
      <div class="report-shell">
        ${buildBrandedHeaderMarkup(doc)}

        <section class="report-meta">
          ${doc.meta.map((item) => `
            <div class="meta-card">
              <div class="label">${escapeHtml(item.label)}</div>
              <div class="value">${escapeHtml(item.value)}</div>
            </div>
          `).join("")}
        </section>

        <section class="sections">
          ${doc.sections.map((section, index) => `
            <div class="section-card ${index === 0 ? "full" : ""}">
              ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
              ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            </div>
          `).join("")}
        </section>
        ${doc.tables && doc.tables.length > 0 ? doc.tables.map((tbl) => `
          <div class="section-card full" style="margin-top:16px;">
            <h2>${escapeHtml(tbl.title)}</h2>
            <table class="data-table">
              <thead><tr>${tbl.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
              <tbody>${tbl.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
          </div>
        `).join("") : ""}
        <div class="footer">
          ${doc.footer.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function buildDocumentMarkup(doc: ExportableDocument) {
  if (doc.kind === "laudo") return buildLaudoMarkup(doc);
  if (doc.kind === "report") return buildReportMarkup(doc);
  return buildDefaultMarkup(doc);
}

export function buildWordHtml(doc: ExportableDocument) {
  return `<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(doc.title)}</title>
    </head>
    <body>
      ${buildDocumentMarkup(doc)}
    </body>
  </html>`;
}

async function inlineImages(html: string): Promise<string> {
  const matches = [...html.matchAll(/src="(https?:\/\/[^"]+)"/g)];
  const urls = [...new Set(matches.map((m) => m[1]))];
  const map = new Map<string, string>();
  await Promise.all(
    urls.map(async (rawUrl) => {
      // Decode HTML entities that escapeHtml may have inserted (&amp; -> &)
      const url = rawUrl.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const blob = await res.blob();
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        map.set(rawUrl, b64);
      } catch {
        // keep original URL on failure
      }
    }),
  );
  return html.replace(/src="(https?:\/\/[^"]+)"/g, (_, rawUrl) => {
    const b64 = map.get(rawUrl);
    return b64 ? `src="${b64}"` : `src="${rawUrl}"`;
  });
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function shareFile(blob: Blob, filename: string, title: string, text: string) {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });

  if (typeof navigator !== "undefined" && "share" in navigator && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text });
    return true;
  }

  saveBlob(blob, filename);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  return false;
}

export async function downloadWordDocument(doc: ExportableDocument) {
  if (doc.kind === "laudo") {
    const blob = await createLaudoDocxBlob(doc);
    saveBlob(blob, `${doc.filenameBase}.docx`);
    return;
  }

  const html = await inlineImages(buildWordHtml(doc));
  const blob = new Blob([html], { type: "application/msword" });
  saveBlob(blob, `${doc.filenameBase}.doc`);
}

export async function downloadPdfDocument(doc: ExportableDocument) {
  if (doc.kind === "laudo") {
    const blob = await createLaudoPdfBlob(doc);
    saveBlob(blob, `${doc.filenameBase}.pdf`);
    return;
  }

  const blob = await createGenericPdfBlob(doc);
  saveBlob(blob, `${doc.filenameBase}.pdf`);
}

export async function shareDocumentViaWhatsApp(doc: ExportableDocument, format: "pdf" | "word" = "pdf") {
  if (doc.kind === "laudo") {
    const blob = format === "pdf"
      ? await createLaudoPdfBlob(doc)
      : await createLaudoDocxBlob(doc);

    return shareFile(
      blob,
      `${doc.filenameBase}.${format === "pdf" ? "pdf" : "docx"}`,
      doc.title,
      `Segue o documento ${doc.title} (${doc.meta.find((item) => item.label === "Nº do laudo")?.value ?? doc.filenameBase}).`,
    );
  }

  if (format === "pdf") {
    const blob = await createGenericPdfBlob(doc);
    return shareFile(
      blob,
      `${doc.filenameBase}.pdf`,
      doc.title,
      `Segue o documento ${doc.title} (${doc.filenameBase}).`,
    );
  }
  const html = await inlineImages(buildWordHtml(doc));
  const blob = new Blob([html], { type: "application/msword" });
  return shareFile(
    blob,
    `${doc.filenameBase}.doc`,
    doc.title,
    `Segue o documento ${doc.title} (${doc.meta.find((item) => item.label === "Nº do laudo")?.value ?? doc.filenameBase}).`,
  );
}
