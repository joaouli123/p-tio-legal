import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import logoMaringaSat from "@/assets/logo-maringa-sat.jpg";

interface LaudoFoto {
  url: string;
  label: string;
}

interface LaudoPdfData {
  title: string;
  fields?: Record<string, string>;
  fotos?: LaudoFoto[];
  identificationRows?: Array<[string, string]>;
  laudoNarrativo?: boolean;
}

function getField(doc: LaudoPdfData, key: string, fallback = "—") {
  return doc.fields?.[key] ?? fallback;
}

function cleanUrl(value?: string) {
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
  const normalizedUrl = cleanUrl(url);
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

export async function createLaudoPdfBlob(doc: LaudoPdfData) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - (margin * 2);
  const bannerHeight = contentWidth * (636 / 3872);
  let y = 38;

  const logoUrl = typeof window !== "undefined"
    ? new URL(logoMaringaSat as string, window.location.href).href
    : (logoMaringaSat as string);

  const [logoData, qrData, photoData] = await Promise.all([
    fetchImageDataUrl(logoUrl),
    fetchImageDataUrl(getField(doc, "qrCodeUrl", "")),
    Promise.all((doc.fotos ?? []).map((foto) => fetchImageDataUrl(foto.url))),
  ]);

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  };

  const drawParagraph = (text: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, y);
    y += (lines.length * 15) + 6;
  };

  const drawLabelValue = (label: string, value: string, x = margin) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(label, x, y);
    const offset = pdf.getTextWidth(label) + 4;
    pdf.setFont("helvetica", "normal");
    pdf.text(value, x + offset, y);
  };

  if (logoData) {
    pdf.addImage(logoData, inferImageFormat(logoData), margin, y, contentWidth, bannerHeight);
    y += bannerHeight + 26;
  } else {
    y += 10;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  if (doc.laudoNarrativo) {
    const titleLines = pdf.splitTextToSize(doc.title, contentWidth);
    pdf.text(titleLines, pageWidth / 2, y, { align: "center" });
    y += titleLines.length * 24 + 12;
  } else {
    pdf.text(doc.title, pageWidth / 2, y, { align: "center" });
    y += 34;
  }

  if (doc.laudoNarrativo) {
    const drawSectionTitle = (text: string) => {
      ensureSpace(30);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(text, margin, y);
      y += 18;
    };
    const drawBullet = (text: string) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const bulletIndent = 16;
      const lines = pdf.splitTextToSize(text, contentWidth - bulletIndent);
      ensureSpace(lines.length * 15 + 4);
      pdf.text("•", margin, y);
      pdf.text(lines, margin + bulletIndent, y);
      y += lines.length * 15 + 4;
    };

    const qtdFem = getField(doc, "qtdFem");
    const qtdMasc = getField(doc, "qtdMasc");
    const delegacia = getField(doc, "delegacia", "Delegacia requisitante");

    pdf.setTextColor(0, 0, 0);
    drawLabelValue("LAUDO Nº:", getField(doc, "laudoNumber"));
    y += 22;
    drawLabelValue("DATA/HORA:", getField(doc, "destructionDate"));
    y += 22;
    // REQUISITADA wraps across lines (it carries the full CNPJ + address).
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("REQUISITADA:", margin, y);
    const reqOffset = pdf.getTextWidth("REQUISITADA:") + 4;
    pdf.setFont("helvetica", "normal");
    const reqText = "MARINGÁ SAT – PRESTADORA DE SERVIÇOS EM VEÍCULOS LTDA. CNPJ: 12.160.871/0001-51 — ENDEREÇO: Avenida Paranavaí, 1489 – Parque das Laranjeiras – Maringá/PR";
    const reqLines = pdf.splitTextToSize(reqText, contentWidth - reqOffset);
    pdf.text(reqLines, margin + reqOffset, y);
    y += reqLines.length * 15 + 18;

    drawSectionTitle("I. OBJETIVO");
    drawParagraph(`Em atendimento à solicitação encaminhada pela ${delegacia}, a empresa MARINGÁ SAT foi responsável pela destruição física de ${qtdFem} máquinas eletrônicas do tipo caça-níquel, apreendidas e destinadas à inutilização definitiva.`);

    drawSectionTitle("II. CONSIDERAÇÕES INICIAIS");
    drawParagraph("A destruição foi realizada nas dependências da MARINGÁ SAT, utilizando equipamento industrial triturador de sucata, garantindo a completa descaracterização e inutilização dos equipamentos.");

    drawSectionTitle("III. DA DESTRUIÇÃO");
    drawParagraph(`Foram submetidas à destruição total ${qtdFem} máquinas caça-níqueis.`);
    drawParagraph("O procedimento consistiu em:");
    drawBullet("Recebimento e conferência dos equipamentos;");
    drawBullet("Inserção das máquinas no triturador industrial de sucata;");
    drawBullet("Trituração integral das estruturas metálicas, componentes eletrônicos, gabinetes e acessórios;");
    drawBullet("Descaracterização irreversível dos equipamentos;");
    drawBullet("Separação dos resíduos recicláveis;");
    drawBullet("Destinação ambientalmente adequada dos materiais resultantes.");
    y += 6;
    drawParagraph("As fotografias registram os equipamentos antes da destruição, durante o processo de trituração e após sua completa transformação em sucata fragmentada.");

    ensureSpace(140);
    drawSectionTitle("IV. REGISTRO FOTOGRÁFICO E DOCUMENTAL");
    drawParagraph("O procedimento foi integralmente registrado por meio fotográfico, comprovando a destruição total dos equipamentos.");

    const hashValue = getField(doc, "hashSha256", "");
    if (qrData) {
      ensureSpace(100);
      pdf.addImage(qrData, inferImageFormat(qrData), margin, y, 74, 74);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Verificação digital do laudo:", margin + 90, y + 12);
      pdf.setFont("helvetica", "normal");
      const verificationLines = pdf.splitTextToSize(getField(doc, "verificationUrl"), contentWidth - 100);
      pdf.text(verificationLines, margin + 90, y + 30);
      let hashBottom = y + 30 + verificationLines.length * 12;
      if (hashValue) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text("Hash SHA-256:", margin + 90, hashBottom + 6);
        pdf.setFont("courier", "normal");
        pdf.setFontSize(7);
        const hashLines = pdf.splitTextToSize(hashValue, contentWidth - 100);
        pdf.text(hashLines, margin + 90, hashBottom + 18);
        hashBottom += 18 + hashLines.length * 9;
      }
      y = Math.max(y + 90, hashBottom + 8);
    } else {
      drawParagraph(`Verificação digital do laudo: ${getField(doc, "verificationUrl")}`);
      if (hashValue) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text("Hash SHA-256:", margin, y);
        pdf.setFont("courier", "normal");
        pdf.setFontSize(7);
        const hashLines = pdf.splitTextToSize(hashValue, contentWidth);
        pdf.text(hashLines, margin, y + 12);
        y += 12 + hashLines.length * 9 + 6;
      }
    }

    ensureSpace(130);
    drawSectionTitle("V. CONCLUSÃO");
    drawParagraph(`Certifico que os ${qtdMasc} equipamentos caça-níqueis foram completamente destruídos mediante processo de trituração industrial, tornando impossível sua recuperação, reutilização ou funcionamento.`);
    drawParagraph("Todo o procedimento ocorreu em ambiente controlado, seguindo os protocolos de segurança operacional e destinação ambientalmente adequada dos resíduos.");

    const fotos = doc.fotos ?? [];
    if (fotos.length > 0) {
      ensureSpace(60);
      drawSectionTitle("REGISTRO FOTOGRÁFICO");

      const perRow = 3;
      const gap = 16;
      const captionHeight = 16;
      const photoWidth = (contentWidth - gap * (perRow - 1)) / perRow;
      const photoHeight = photoWidth * 0.66;
      const rowHeight = photoHeight + captionHeight;

      fotos.forEach((foto, index) => {
        const col = index % perRow;
        if (col === 0) {
          ensureSpace(rowHeight + 8);
        }
        const x = margin + col * (photoWidth + gap);
        const image = photoData[index];

        if (image) {
          pdf.addImage(image, inferImageFormat(image), x, y, photoWidth, photoHeight);
          pdf.setDrawColor(170, 170, 170);
          pdf.rect(x, y, photoWidth, photoHeight);
        } else {
          pdf.setDrawColor(170, 170, 170);
          pdf.rect(x, y, photoWidth, photoHeight);
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(9);
          pdf.text("Imagem indisponível", x + (photoWidth / 2), y + (photoHeight / 2), { align: "center" });
        }

        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        const caption = pdf.splitTextToSize(foto.label, photoWidth)[0] ?? foto.label;
        pdf.text(caption, x + (photoWidth / 2), y + photoHeight + 11, { align: "center" });

        if (col === perRow - 1 || index === fotos.length - 1) {
          y += rowHeight + 8;
        }
      });

      y += 12;
    }

    ensureSpace(140);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Maringá/PR, ${getField(doc, "destructionDateLong")}.`, margin, y + 8);
    y += 74;
    pdf.setDrawColor(0, 0, 0);
    pdf.line(pageWidth - 250, y, pageWidth - 40, y);
    pdf.setFont("helvetica", "bold");
    pdf.text("Jardel F. Pinto", pageWidth - 145, y + 18, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("Representante Técnico Nomeado", pageWidth - 145, y + 34, { align: "center" });

    return pdf.output("blob");
  }

  pdf.setTextColor(0, 0, 0);
  drawLabelValue("LAUDO Nº:", getField(doc, "laudoNumber"));
  y += 22;
  drawLabelValue("DATA/HORA:", getField(doc, "destructionDate"));
  y += 22;
  drawLabelValue("OFÍCIO REQUISITANTE:", `Ofício nº ${getField(doc, "oficio")}`);
  y += 22;
  drawLabelValue("PROCESSO Nº:", getField(doc, "processo"));
  y += 22;
  drawLabelValue("REQUISITADA:", "MARINGÁ SAT – PRESTADORA DE SERVIÇOS EM VEÍCULOS LTDA.");
  y += 28;

  const bemLabel = getField(doc, "bemLabel", "veículo");
  const identificationRows = doc.identificationRows ?? [
    ["Veículo", getField(doc, "tipoBem")],
    ["Marca/Modelo", getField(doc, "marcaModelo")],
    ["Placa", getField(doc, "placa")],
    ["Chassis", getField(doc, "chassi")],
    ["Cor", getField(doc, "cor")],
    ["Ano", getField(doc, "ano")],
    ["Renavam", getField(doc, "renavam")],
    ["Processo Administrativo", getField(doc, "processo")],
  ];

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("I. OBJETIVO", margin, y);
  y += 18;
  drawParagraph(`Em cumprimento à determinação recebida por meio do Ofício nº ${getField(doc, "oficio")}, oriundo do juízo da ${getField(doc, "varaComarca")}, a empresa MARINGÁ SAT foi requisitada para proceder com a destruição do ${bemLabel} discriminado abaixo:`);
  y += 8;

  autoTable(pdf, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6, lineColor: [68, 68, 68], lineWidth: 0.8, textColor: [0, 0, 0] },
    bodyStyles: { halign: "left", valign: "middle" },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.42, fontStyle: "normal" },
      1: { cellWidth: contentWidth * 0.58 },
    },
    body: identificationRows.map(([label, value]) => [label, value]),
  });

  y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("II. CONSIDERAÇÕES INICIAIS", margin, y);
  y += 18;
  drawParagraph("A presente destruição foi autorizada e determinada pela autoridade judicial competente, visando o cumprimento das normas legais aplicáveis à destinação de bens apreendidos.");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("III. DA DESTRUIÇÃO", margin, y);
  y += 18;
  drawParagraph(`Foram submetidas à destruição total as partes e componentes do ${bemLabel} acima identificado, conforme determinado pelo ofício supracitado.`);
  drawParagraph("O procedimento compreendeu: descontaminação ambiental do veículo; remoção de resíduos e fluidos; descaracterização estrutural; inutilização dos elementos identificadores; separação técnica dos materiais recicláveis; e destinação final ambientalmente adequada da sucata.");

  ensureSpace(140);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("IV. REGISTRO FOTOGRÁFICO E DOCUMENTAL", margin, y);
  y += 18;
  drawParagraph("O procedimento de recolhimento, descontaminação, destruição e destinação do veículo foi devidamente registrado por meio de fotografias e documentos técnicos.");
  drawParagraph("O acesso ao arquivo digital poderá ser realizado através do QR Code correspondente.");

  const hashValue = getField(doc, "hashSha256", "");
  if (qrData) {
    pdf.addImage(qrData, inferImageFormat(qrData), margin, y, 74, 74);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Verificação digital do laudo:", margin + 90, y + 12);
    pdf.setFont("helvetica", "normal");
    const verificationLines = pdf.splitTextToSize(getField(doc, "verificationUrl"), contentWidth - 100);
    pdf.text(verificationLines, margin + 90, y + 30);
    let hashBottom = y + 30 + verificationLines.length * 12;
    if (hashValue) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Hash SHA-256:", margin + 90, hashBottom + 6);
      pdf.setFont("courier", "normal");
      pdf.setFontSize(7);
      const hashLines = pdf.splitTextToSize(hashValue, contentWidth - 100);
      pdf.text(hashLines, margin + 90, hashBottom + 18);
      hashBottom += 18 + hashLines.length * 9;
    }
    y = Math.max(y + 90, hashBottom + 8);
  } else {
    drawParagraph(`Verificação digital do laudo: ${getField(doc, "verificationUrl")}`);
    if (hashValue) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Hash SHA-256:", margin, y);
      pdf.setFont("courier", "normal");
      pdf.setFontSize(7);
      const hashLines = pdf.splitTextToSize(hashValue, contentWidth);
      pdf.text(hashLines, margin, y + 12);
      y += 12 + hashLines.length * 9 + 6;
    }
  }

  ensureSpace(130);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("V. CONCLUSÃO", margin, y);
  y += 18;
  drawParagraph("Certifico que foram concluídas todas as operações de descontaminação, destruição e destinação das sucatas, conduzidas com rigoroso protocolo de segurança e controle.");
  drawParagraph("Todo o processo ocorreu em ambiente seguro e protegido, sob constante supervisão e na presença de testemunhas, garantindo assim a transparência do procedimento desde a retirada do bem até o encaminhamento final da sucata para reciclagem.");
  drawParagraph("O presente laudo foi redigido pelo representante legal da MARINGÁ SAT, Sr. Jardel F. Pinto, devidamente inscrito no CPF sob o nº 003.614.589-08.");

  const fotos = doc.fotos ?? [];
  if (fotos.length > 0) {
    ensureSpace(60);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("VI. REGISTRO FOTOGRÁFICO", margin, y);
    y += 18;

    // Grid layout: up to 3 photos per row, wrapping to new rows/pages so more
    // than 3 photos no longer overflow the page width (mirrors HTML/DOCX).
    const perRow = 3;
    const gap = 16;
    const captionHeight = 16;
    const photoWidth = (contentWidth - gap * (perRow - 1)) / perRow;
    const photoHeight = photoWidth * 0.66;
    const rowHeight = photoHeight + captionHeight;

    fotos.forEach((foto, index) => {
      const col = index % perRow;
      if (col === 0) {
        // Starting a new row — ensure the whole row fits, else new page.
        ensureSpace(rowHeight + 8);
      }
      const x = margin + col * (photoWidth + gap);
      const image = photoData[index];

      if (image) {
        pdf.addImage(image, inferImageFormat(image), x, y, photoWidth, photoHeight);
        pdf.setDrawColor(170, 170, 170);
        pdf.rect(x, y, photoWidth, photoHeight);
      } else {
        pdf.setDrawColor(170, 170, 170);
        pdf.rect(x, y, photoWidth, photoHeight);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        pdf.text("Imagem indisponível", x + (photoWidth / 2), y + (photoHeight / 2), { align: "center" });
      }

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      const caption = pdf.splitTextToSize(foto.label, photoWidth)[0] ?? foto.label;
      pdf.text(caption, x + (photoWidth / 2), y + photoHeight + 11, { align: "center" });

      // Advance y after the last column of each row (or the final photo).
      if (col === perRow - 1 || index === fotos.length - 1) {
        y += rowHeight + 8;
      }
    });

    y += 12;
  }

  ensureSpace(140);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Maringá/PR, ${getField(doc, "destructionDateLong")}.`, margin, y + 8);
  y += 74;
  pdf.setDrawColor(0, 0, 0);
  pdf.line(pageWidth - 250, y, pageWidth - 40, y);
  pdf.setFont("helvetica", "bold");
  pdf.text("Jardel F. Pinto", pageWidth - 145, y + 18, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.text("Representante Técnico Nomeado", pageWidth - 145, y + 34, { align: "center" });

  return pdf.output("blob");
}