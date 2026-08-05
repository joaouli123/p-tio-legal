import logoMaringaSat from "@/assets/logo-maringa-sat.jpg";
import signatureImage from "@/assets/assianturaa.jpeg";
import checklistCarro from "@/assets/checklist-carro.png";
import { CHECKLIST_ITEMS } from "@/lib/checklist-config";
import type { Veiculo, Servico } from "@/lib/db";
import { DEFAULT_PUBLIC_URL } from "@/lib/public-url";

export interface ChecklistPdfData {
  veiculo: Veiculo;
  numero?: string;
  tipo?: "entrada" | "saida" | "transferencia";
  documentos_presentes?: boolean;
  chaves_presentes?: boolean;
  placa_identificavel?: boolean;
  chassi_identificavel?: boolean;
  vidros_intactos?: boolean;
  pneus_presentes?: boolean;
  motor_presente?: boolean;
  bateria_presente?: boolean;
  macaco_chave_roda?: boolean;
  triangulo_presente?: boolean;
  extintor_presente?: boolean;
  observacoes?: string;
  fotos?: { url: string; label: string }[];
  servicos?: Servico[];
}

function resolveAssetUrl(asset: string): string {
  return typeof window !== "undefined"
    ? new URL(asset, window.location.href).href
    : asset;
}

function getLogoUrl(): string {
  return resolveAssetUrl(logoMaringaSat as string);
}

function getCarImageUrl(): string {
  return resolveAssetUrl(checklistCarro as string);
}

function getSignatureUrl(): string {
  return resolveAssetUrl(signatureImage as string);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildQrUrl(veiculo: Veiculo): string {
  const base = typeof window !== "undefined"
    ? window.location.origin
    : DEFAULT_PUBLIC_URL;
  const target = `${base}/checklist?veiculo=${encodeURIComponent(veiculo.id)}&placa=${encodeURIComponent(veiculo.placa)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=2&data=${encodeURIComponent(target)}`;
}

function formatDt(iso?: string) {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function sq(checked?: boolean): string {
  return checked
    ? '<span class="sq sq-on"></span>'
    : '<span class="sq"></span>';
}

function fld(label: string, value?: string | null): string {
  return `<div class="field"><div class="f-label">${label}</div><div class="f-value">${value?.trim() || "&nbsp;"}</div></div>`;
}

// Fields not stored in the cadastro (RENAVAM, dados do responsável/proprietário)
// are intentionally blank in the system. Render an explicit "preencher à mão"
// placeholder so the empty line reads as a manual field, not a bug.
const FILL_BY_HAND = '<span style="color:#999;font-style:italic;font-weight:normal;">(preencher à mão)</span>';

function fldManual(label: string, value?: string | null): string {
  const rendered = value?.trim() ? value.trim() : FILL_BY_HAND;
  return `<div class="field"><div class="f-label">${label}</div><div class="f-value">${rendered}</div></div>`;
}

function secHead(num: number | string, title: string): string {
  return `<div class="sec-head"><span class="sec-num">${num}</span><span>${title}</span></div>`;
}

const TYPE_OPTIONS = [
  { key: "entrada", label: "ENTRADA" },
  { key: "saida", label: "SAÍDA" },
  { key: "transferencia", label: "TRANSFERÊNCIA" },
] as const;

const VEHICLE_TYPE_OPTIONS = [
  { key: "automovel", label: "CARRO" },
  { key: "motocicleta", label: "MOTO" },
  { key: "caminhao", label: "CAMINHÃO" },
  { key: "van_utilitario", label: "VAN / UTILITÁRIO" },
  { key: "onibus", label: "ÔNIBUS" },
  { key: "outro", label: "OUTROS" },
] as const;

const VEHICLE_CONDITION_OPTIONS = [
  { key: "integro", label: "ÍNTEGRO" },
  { key: "sinistrado", label: "SINISTRADO" },
  { key: "queimado", label: "QUEIMADO" },
  { key: "sucata", label: "SUCATA" },
  { key: "descaracterizado", label: "DESCARACTERIZADO" },
] as const;

const PHOTO_SLOTS = ["FRENTE", "TRASEIRA", "LATERAL ESQUERDA", "INTERIOR"] as const;

export function buildChecklistHtml(data: ChecklistPdfData): string {
  const { veiculo, tipo = "entrada" } = data;
  const servicos = data.servicos ?? [];
  const numero = data.numero ?? veiculo.id.slice(-7).toUpperCase();
  const logoSrc = getLogoUrl();
  const carImageSrc = getCarImageUrl();
  const signatureSrc = getSignatureUrl();
  const qrSrc = buildQrUrl(veiculo);
  const now = formatDt();

  const totalDiarias = servicos
    .filter((servico) => servico.tipo === "diaria")
    .reduce((sum, servico) => sum + Number(servico.quantidade) * Number(servico.valor_unitario), 0);
  const totalServicosVal = servicos
    .filter((servico) => servico.tipo !== "diaria")
    .reduce((sum, servico) => sum + Number(servico.quantidade) * Number(servico.valor_unitario), 0);
  const totalGeral = totalDiarias + totalServicosVal;
  const diasDiaria = servicos
    .filter((servico) => servico.tipo === "diaria")
    .reduce((sum, servico) => sum + Number(servico.quantidade), 0);
  const diasCalc = diasDiaria > 0
    ? String(diasDiaria)
    : String(Math.max(1, Math.ceil((Date.now() - new Date(veiculo.created_at).getTime()) / 86400000)));
  const allPaid = servicos.length > 0 && servicos.every((servico) => servico.pago);
  const anyPending = servicos.some((servico) => !servico.pago);
  const isIsento = servicos.length === 0;
  const isSaida = veiculo.status === "restituido" || veiculo.status === "destruido";
  const dataSaida = isSaida ? formatDt(veiculo.updated_at) : "___/___/________";

  const checklistRows = CHECKLIST_ITEMS.map((item) => ({
    label: item.pdfLabel ?? item.label,
    ok: data[item.key],
  }));
  const completedCount = checklistRows.filter((row) => row.ok).length;
  const observacoes = data.observacoes?.trim() || "Sem observações registradas no checklist.";

  const tipoHtml = TYPE_OPTIONS
    .map((option) => `<div class="tipo-opt">${sq(tipo === option.key)}<span>${option.label}</span></div>`)
    .join("");

  const tipoVeiculoHtml = VEHICLE_TYPE_OPTIONS
    .map((option) => `<div class="chk-item">${sq(veiculo.tipo === option.key)}<span>${option.label}</span></div>`)
    .join("");

  const situacaoVeiculoHtml = VEHICLE_CONDITION_OPTIONS
    .map((option) => `<div class="chk-item">${sq(veiculo.situacao === option.key)}<span>${option.label}</span></div>`)
    .join("");

  const checklistRowsHtml = checklistRows
    .map((row) => `
      <tr>
        <td>${row.label}</td>
        <td class="ok-c">${row.ok === true ? "✓" : ""}</td>
        <td class="av-c">${row.ok === false ? "✗" : ""}</td>
        <td></td>
      </tr>`)
    .join("");

  const servicosItens = [
    { label: "GUINCHO", checked: servicos.some((servico) => servico.tipo === "guincho") },
    { label: "EMPILHADEIRA", checked: servicos.some((servico) => servico.tipo === "empilhadeira") },
    { label: "MUNCK", checked: servicos.some((servico) => servico.tipo === "munck") },
    { label: "DIÁRIA / ESTADIA", checked: servicos.some((servico) => servico.tipo === "diaria") },
  ];
  const servicosHtml = servicosItens
    .map((item) => `<div class="chk-item">${sq(item.checked)}<span>${item.label}</span></div>`)
    .join("");
  const servicosDescricao = servicos
    .map((servico) => servico.descricao?.trim())
    .filter((value): value is string => !!value)
    .join(" • ");

  const photoItems = data.fotos && data.fotos.length > 0
    ? data.fotos.map((foto, index) => ({
      url: foto.url,
      label: foto.label.trim().toUpperCase() || `FOTO ${index + 1}`,
    }))
    : PHOTO_SLOTS.map((slot) => ({ url: "", label: slot }));

  const photosHtml = photoItems.map((foto) => {
    const label = foto.label;
    return `<div class="photo-box">
      ${foto.url ? `<img src="${escapeHtml(foto.url)}" alt="${escapeHtml(label)}" />` : `<div class="photo-ph-txt">${escapeHtml(label)}</div>`}
      <div class="photo-lbl">${escapeHtml(label)}</div>
    </div>`;
  }).join("");

  const signaturesHtml = [
    { role: "RESPONSÁVEL PELO PÁTIO", name: "Jardel F. Pinto", id: "Mat. 00123" },
    { role: "CONDUTOR / PROPRIETÁRIO", name: "", id: "CPF: ___________________" },
    { role: "AGENTE PÚBLICO", name: "", id: "Mat.: ___________" },
  ].map((signature, index) => `
    <div class="sig-blk">
      ${index === 0 ? secHead(9, "ASSINATURAS") : '<div class="sec-head"><span class="sec-num">&nbsp;</span><span>&nbsp;</span></div>'}
      <div class="sig-inner">
        ${index === 0
          ? `<img class="sig-image" src="${escapeHtml(signatureSrc)}" alt="Assinatura de Jardel Francisco Pinto" />`
          : '<div class="sig-area"></div>'}
        <div class="sig-name">${signature.name}</div>
        <div class="sig-role">${signature.role}</div>
        <div class="sig-role">${signature.id}</div>
      </div>
    </div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Checklist ${numero} — ${veiculo.placa}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#111;background:#fff;}
@page{size:A4 portrait;margin:5mm;}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
.page{width:200mm;padding:0;margin:0 auto;}
.doc-head{display:flex;align-items:center;background:linear-gradient(135deg,#1A3560 0%,#2E5FA3 100%);color:#fff;padding:8px 12px;border-radius:6px 6px 0 0;gap:10px;}
.doc-head-logo{height:50px;object-fit:contain;border-radius:3px;background:#fff;padding:2px 5px;}
.doc-head-title{flex:1;text-align:center;}
.co-name{font-size:13px;font-weight:bold;letter-spacing:.4px;margin-bottom:2px;}
.co-sub{font-size:6.5px;opacity:.82;margin-bottom:4px;}
.doc-kind{display:inline-block;background:rgba(255,255,255,.18);border-radius:4px;padding:3px 12px;font-size:11px;font-weight:bold;letter-spacing:.4px;}
.doc-head-qr{text-align:center;font-size:6px;opacity:.88;}
.doc-head-qr img{width:62px;height:62px;background:#fff;border-radius:4px;padding:2px;display:block;margin-bottom:2px;}
.subhead{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:2px;margin:2px 0;}
.sub-cell{border:1.5px solid #1A3560;padding:3px 7px;display:flex;align-items:center;gap:6px;}
.sub-lbl{font-size:7.5px;font-weight:bold;color:#1A3560;white-space:nowrap;}
.sub-val{font-size:10px;font-weight:bold;letter-spacing:.4px;}
.tipo-opts{display:flex;gap:8px;}
.tipo-opt{display:flex;align-items:center;gap:3px;font-size:7.5px;}
.sec{border:1.5px solid #1A3560;overflow:hidden;}
.sec-head{background:#1A3560;color:#fff;font-weight:bold;font-size:7.5px;padding:3px 7px;display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:.3px;}
.sec-num{background:rgba(255,255,255,.22);border-radius:50%;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:bold;flex-shrink:0;}
.sec-body{padding:4px 7px;}
.field{margin-bottom:3.5px;padding-bottom:2.5px;border-bottom:.5px solid #ddd;}
.f-label{font-size:6.5px;color:#555;text-transform:uppercase;font-weight:bold;margin-bottom:1px;}
.f-value{font-size:8.5px;font-weight:bold;min-height:12px;}
.sq{display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;border:1.5px solid #1A3560;border-radius:2px;flex-shrink:0;vertical-align:middle;}
.sq.sq-on{background:#1A3560;color:#fff;}
.sq.sq-on::after{content:"✓";font-size:7px;line-height:1;font-family:Arial;}
.chk-list{display:flex;flex-direction:column;gap:2px;}
.chk-item{display:flex;align-items:center;gap:4px;font-size:7.5px;padding:1px 0;}
.chk-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;}
.main-grid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:2px;margin-bottom:2px;}
.col2{display:flex;flex-direction:column;gap:2px;}
.mid-grid{display:grid;grid-template-columns:1fr 1fr 2fr;gap:2px;margin-bottom:2px;}
.vis-tbl{width:100%;border-collapse:collapse;font-size:7px;margin-top:3px;}
.vis-tbl th{background:#1A3560;color:#fff;padding:2px 3px;text-align:center;border:.5px solid #1A3560;font-size:6.5px;}
.vis-tbl td{border:.5px solid #ccc;padding:2px 3px;text-align:center;}
.vis-tbl td:first-child{text-align:left;font-weight:bold;font-size:6.2px;}
.ok-c{color:#2e7d32;font-weight:bold;}
.av-c{color:#c62828;font-weight:bold;}
.car-wrap{display:flex;justify-content:center;padding:2px 0 3px;}
.car-wrap img{width:100%;max-height:255px;object-fit:contain;display:block;}
.summary-strip{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:2px;font-size:6.8px;font-weight:bold;color:#1A3560;}
.obs-box{min-height:70px;border:1px solid #d6dde8;border-radius:4px;background:#f8fafc;padding:8px;font-size:7.5px;line-height:1.45;white-space:pre-wrap;}
.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:4px;}
.photo-box{border:1px solid #bbb;min-height:70px;aspect-ratio:4/3;height:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:3px;background:#f8fafc;overflow:hidden;position:relative;}
.photo-box img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;}
.photo-lbl{position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:6px;background:rgba(255,255,255,.85);padding:1px 0;}
.photo-ph-txt{font-size:6px;color:#999;text-align:center;}
.fin-sec{border:1.5px solid #1A3560;margin-bottom:2px;overflow:hidden;}
.fin-body{display:grid;grid-template-columns:1.2fr 1fr .9fr;padding:5px 8px;gap:14px;}
.fin-row{display:flex;align-items:center;gap:6px;margin-bottom:3.5px;border-bottom:.5px solid #ddd;padding-bottom:2.5px;}
.fin-lbl{font-size:7px;font-weight:bold;color:#555;white-space:nowrap;}
.fin-val{font-size:8.5px;font-weight:bold;flex:1;}
.total-box{border:2px solid #1A3560;border-radius:4px;padding:4px 6px;text-align:center;margin-bottom:6px;}
.total-lbl{font-size:6.5px;text-transform:uppercase;color:#555;}
.total-val{font-size:16px;font-weight:bold;color:#1A3560;}
.st-group{display:flex;flex-direction:column;gap:3px;}
.st-item{display:flex;align-items:center;gap:4px;font-size:7.5px;}
.sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;margin-bottom:2px;}
.sig-blk{border:1.5px solid #1A3560;overflow:hidden;}
.sig-inner{padding:5px 7px;}
.sig-area{height:30px;border-bottom:1px solid #444;margin:6px 0 3px;}
.sig-image{display:block;width:100%;height:auto;max-height:56px;object-fit:contain;margin:0 auto 2px;}
.sig-name{font-size:7.5px;font-weight:bold;text-align:center;}
.sig-role{font-size:6.5px;color:#555;text-align:center;}
.val-row{display:grid;grid-template-columns:1fr auto;gap:2px;margin-bottom:2px;}
.val-sec{border:1.5px solid #1A3560;overflow:hidden;}
.val-body{padding:5px 8px;}
.val-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:4px 0;}
.val-lbl{font-size:6.5px;color:#555;text-transform:uppercase;font-weight:bold;}
.val-val{font-size:8px;font-weight:bold;}
.doc-valid{display:flex;align-items:center;gap:6px;color:#2e7d32;font-weight:bold;font-size:8px;margin-top:5px;padding:3px 6px;background:#e8f5e9;border-radius:3px;border:1px solid #a5d6a7;}
.val-qr{border:1.5px solid #1A3560;padding:4px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.val-qr img{width:60px;height:60px;border-radius:3px;}
.val-qr-txt{font-size:6px;color:#555;margin-top:2px;text-align:center;}
.doc-footer{display:flex;justify-content:space-around;background:#1A3560;color:#fff;padding:5px 10px;border-radius:0 0 6px 6px;margin-top:2px;}
.foot-item{display:flex;align-items:center;gap:4px;font-size:7px;font-weight:bold;text-transform:uppercase;letter-spacing:.4px;}
</style>
</head>
<body>
<div class="page">

<div class="doc-head">
  <img src="${logoSrc}" class="doc-head-logo" alt="Logo Pátio Legal" />
  <div class="doc-head-title">
    <div class="co-name">PÁTIO LEGAL MARINGÁ SAT</div>
    <div class="co-sub">Sistema de Gestão de Pátio e Remoção Veicular · MARINGÁ SAT – PRESTADORA DE SERVIÇOS EM VEÍCULOS LTDA</div>
    <div class="doc-kind">CHECKLIST DE ENTRADA / SAÍDA VEICULAR</div>
  </div>
  <div class="doc-head-qr">
    <img src="${qrSrc}" alt="QR Code" />
    Escanear para<br/>verificar
  </div>
</div>

<div class="subhead">
  <div class="sub-cell"><span class="sub-lbl">Nº CHECKLIST:</span><span class="sub-val">${numero}</span></div>
  <div class="sub-cell"><span class="sub-lbl">DATA / HORA:</span><span class="sub-val" style="font-size:8.5px;">${now}</span></div>
  <div class="sub-cell"><span class="sub-lbl">TIPO:</span><div class="tipo-opts">${tipoHtml}</div></div>
</div>

<div class="main-grid">
  <div class="sec">
    ${secHead(1, "IDENTIFICAÇÃO DO VEÍCULO")}
    <div class="sec-body">
      ${fld("PLACA:", veiculo.placa)}
      ${fldManual("RENAVAM:", "")}
      ${fld("CHASSI:", veiculo.chassi)}
      ${fld("MARCA / MODELO:", veiculo.marca_modelo)}
      ${fld("COR:", veiculo.cor)}
      ${fld("ANO:", veiculo.ano)}
      <div class="field">
        <div class="f-label">TIPO:</div>
        <div class="chk-row">${tipoVeiculoHtml}</div>
      </div>
      <div class="field" style="border-bottom:none;margin-bottom:0;">
        <div class="f-label">SITUAÇÃO:</div>
        <div class="chk-row">${situacaoVeiculoHtml}</div>
      </div>
    </div>
  </div>

  <div class="col2">
    <div class="sec" style="flex:1;">
      ${secHead(2, "RESPONSÁVEL / PROPRIETÁRIO")}
      <div class="sec-body">
        ${fldManual("NOME:", "")}
        <div style="min-height:12px;border-bottom:.5px solid #ddd;margin-bottom:3px;"></div>
        ${fldManual("CPF / CNPJ:", "")}
        ${fldManual("TELEFONE:", "")}
        ${fldManual("ENDEREÇO:", "")}
        <div style="min-height:16px;border-bottom:.5px solid #ddd;margin-bottom:3px;"></div>
      </div>
    </div>
    <div class="sec" style="flex:1;">
      ${secHead(3, "DADOS DA OCORRÊNCIA")}
      <div class="sec-body">
        ${fld("ÓRGÃO RESPONSÁVEL:", veiculo.delegacia_nome)}
        ${fld("BOLETIM / PROCESSO:", veiculo.processo)}
        ${fld("SETOR:", veiculo.setor)}
        ${fld("REGISTRADO POR:", veiculo.registrado_por)}
        ${fld("LOCAL DA REMOÇÃO:", veiculo.local_vaga)}
      </div>
    </div>
  </div>

  <div class="sec">
    ${secHead(4, "CHECKLIST VISUAL DO VEÍCULO")}
    <div class="sec-body">
      <div class="car-wrap"><img src="${carImageSrc}" alt="Vistas de referência visual do veículo" /></div>
      <div class="summary-strip">
        <span>ITENS CONFERIDOS: ${completedCount}/${CHECKLIST_ITEMS.length}</span>
        <span>REFERÊNCIA VISUAL PADRONIZADA</span>
      </div>
      <table class="vis-tbl">
        <thead>
          <tr><th>ITEM</th><th>OK</th><th>PENDÊNCIA</th><th style="width:36%;">OBSERVAÇÃO</th></tr>
        </thead>
        <tbody>${checklistRowsHtml}</tbody>
      </table>
    </div>
  </div>
</div>

<div class="mid-grid">
  <div class="sec">
    ${secHead(5, "OBSERVAÇÕES DO RECEBIMENTO")}
    <div class="sec-body">
      <div class="obs-box">${observacoes}</div>
    </div>
  </div>

  <div class="sec">
    ${secHead(6, "SERVIÇOS EXECUTADOS")}
    <div class="sec-body">
      <div class="chk-list">${servicosHtml}</div>
      ${servicosDescricao ? `<div style="margin-top:6px;font-size:6.8px;color:#444;"><strong>DETALHES:</strong> ${servicosDescricao}</div>` : ""}
    </div>
  </div>

  <div class="sec">
    ${secHead(7, "REGISTRO FOTOGRÁFICO")}
    <div class="photo-grid">${photosHtml}</div>
  </div>
</div>

<div class="fin-sec">
  ${secHead(8, "INFORMAÇÕES FINANCEIRAS")}
  <div class="fin-body">
    <div>
      <div class="fin-row"><span class="fin-lbl">DATA ENTRADA:</span><span class="fin-val">${formatDt(veiculo.created_at)}</span></div>
      <div class="fin-row"><span class="fin-lbl">DATA SAÍDA:</span><span class="fin-val">${dataSaida}</span></div>
      <div class="fin-row"><span class="fin-lbl">DIAS CALCULADOS:</span><span class="fin-val">${diasCalc}</span></div>
    </div>
    <div>
      <div class="fin-row"><span class="fin-lbl">VALOR DIÁRIAS:</span><span class="fin-val">${fmtBRL(totalDiarias)}</span></div>
      <div class="fin-row"><span class="fin-lbl">VALOR SERVIÇOS:</span><span class="fin-val">${fmtBRL(totalServicosVal)}</span></div>
    </div>
    <div>
      <div class="total-box">
        <div class="total-lbl">TOTAL GERAL</div>
        <div class="total-val">${fmtBRL(totalGeral)}</div>
      </div>
      <div style="font-size:7px;font-weight:bold;color:#1A3560;margin-bottom:3px;">STATUS DA COBRANÇA:</div>
      <div class="st-group">
        <div class="st-item">${sq(anyPending && !allPaid)}<span>PENDENTE</span></div>
        <div class="st-item">${sq(allPaid)}<span>PAGO</span></div>
        <div class="st-item">${sq(isIsento)}<span>ISENTO</span></div>
      </div>
    </div>
  </div>
</div>

<div class="sig-row">${signaturesHtml}</div>

<div class="val-row">
  <div class="val-sec">
    ${secHead(10, "VALIDAÇÃO DO DOCUMENTO")}
    <div class="val-body">
      <div class="val-grid">
        <div><div class="val-lbl">ID DOC:</div><div class="val-val">PLMS-${numero}</div></div>
        <div><div class="val-lbl">HASH:</div><div class="val-val" style="font-size:7px;">${veiculo.id.slice(-14).toUpperCase()}</div></div>
        <div><div class="val-lbl">DATA / HORA EMISSÃO:</div><div class="val-val">${now}</div></div>
      </div>
      <div class="doc-valid">✓ DOCUMENTO VÁLIDO — Escaneie o QR Code para verificar a autenticidade digital deste checklist.</div>
    </div>
  </div>
  <div class="val-qr">
    <img src="${qrSrc}" alt="QR Code" />
    <div class="val-qr-txt">Validação<br/>Digital</div>
  </div>
</div>

<div class="doc-footer">
  <div class="foot-item">SEGURANÇA</div>
  <div class="foot-item">AUDITORIA</div>
  <div class="foot-item">TRANSPARÊNCIA</div>
  <div class="foot-item">LEGALIDADE</div>
</div>

</div>
</body>
</html>`;
}

export function printChecklist(data: ChecklistPdfData): void {
  const html = buildChecklistHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) {
    win.addEventListener("load", () => {
      setTimeout(() => win.print(), 700);
    });
  }
  setTimeout(() => URL.revokeObjectURL(url), 20_000);
}
