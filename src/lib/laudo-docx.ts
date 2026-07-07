import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import logoMaringaSat from "@/assets/logo-maringa-sat.jpg";

interface LaudoFoto {
  url: string;
  label: string;
}

interface LaudoDocData {
  title: string;
  fields?: Record<string, string>;
  fotos?: LaudoFoto[];
  identificationRows?: Array<[string, string]>;
}

const BLUE = "1A3560";
const NONE_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function getField(doc: LaudoDocData, key: string, fallback = "—") {
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

async function fetchImageBytes(url?: string) {
  const normalizedUrl = cleanUrl(url);
  if (!normalizedUrl) return null;

  try {
    const response = await fetch(normalizedUrl);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

function textParagraph(text: string, options?: ConstructorParameters<typeof Paragraph>[0]) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 110 },
    alignment: AlignmentType.JUSTIFIED,
    ...options,
  });
}

function labelValueParagraph(label: string, value: string) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true, size: 24 }),
      new TextRun({ text: value, size: 24 }),
    ],
    spacing: { after: 150 },
  });
}

function sectionTitle(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28 })],
    spacing: { before: 150, after: 110 },
  });
}

function labelCell(text: string) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 20 })],
      }),
    ],
  });
}

function valueCell(text: string) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || " ", size: 20 })],
      }),
    ],
  });
}

function borderlessCell(children: Paragraph[]) {
  return new TableCell({
    borders: NONE_BORDERS,
    children,
  });
}

export async function createLaudoDocxBlob(doc: LaudoDocData) {
  const logoUrl = typeof window !== "undefined"
    ? new URL(logoMaringaSat as string, window.location.href).href
    : (logoMaringaSat as string);

  const [logoData, qrData, photoData] = await Promise.all([
    fetchImageBytes(logoUrl),
    fetchImageBytes(getField(doc, "qrCodeUrl", "")),
    Promise.all((doc.fotos ?? []).map((foto) => fetchImageBytes(foto.url))),
  ]);

  const children: Array<Paragraph | Table> = [];

  if (logoData) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new ImageRun({ data: logoData, transformation: { width: 600, height: 98 } })],
    }));
  }

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 260 },
    children: [new TextRun({ text: doc.title, bold: true, size: 40 })],
  }));

  children.push(labelValueParagraph("LAUDO Nº: ", getField(doc, "laudoNumber")));
  children.push(labelValueParagraph("DATA/HORA: ", getField(doc, "destructionDate")));
  children.push(labelValueParagraph("OFÍCIO REQUISITANTE: ", `Ofício nº ${getField(doc, "oficio")}`));
  children.push(labelValueParagraph("PROCESSO Nº: ", getField(doc, "processo")));
  children.push(labelValueParagraph("REQUISITADA: ", "MARINGÁ SAT – PRESTADORA DE SERVIÇOS EM VEÍCULOS LTDA."));

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

  children.push(sectionTitle("I. OBJETIVO"));
  children.push(textParagraph(
    `Em cumprimento à determinação recebida por meio do Ofício nº ${getField(doc, "oficio")}, oriundo do juízo da ${getField(doc, "varaComarca")}, a empresa MARINGÁ SAT foi requisitada para proceder com a destruição do ${bemLabel} discriminado abaixo:`,
  ));

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: identificationRows.map(([label, value]) => new TableRow({
      children: [
        labelCell(label),
        valueCell(value),
      ],
    })),
  }));

  children.push(sectionTitle("II. CONSIDERAÇÕES INICIAIS"));
  children.push(textParagraph("A presente destruição foi autorizada e determinada pela autoridade judicial competente, visando o cumprimento das normas legais aplicáveis à destinação de bens apreendidos."));

  children.push(sectionTitle("III. DA DESTRUIÇÃO"));
  children.push(textParagraph(`Foram submetidas à destruição total as partes e componentes do ${bemLabel} acima identificado, conforme determinado pelo ofício supracitado.`));
  children.push(textParagraph("O procedimento compreendeu: descontaminação ambiental do veículo; remoção de resíduos e fluidos; descaracterização estrutural; inutilização dos elementos identificadores; separação técnica dos materiais recicláveis; e destinação final ambientalmente adequada da sucata."));

  children.push(sectionTitle("IV. REGISTRO FOTOGRÁFICO E DOCUMENTAL"));
  children.push(textParagraph("O procedimento de recolhimento, descontaminação, destruição e destinação do veículo foi devidamente registrado por meio de fotografias e documentos técnicos."));
  children.push(textParagraph("O acesso ao arquivo digital poderá ser realizado através do QR Code correspondente."));

  if (qrData) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NONE_BORDERS,
      rows: [
        new TableRow({
          children: [
            borderlessCell([
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new ImageRun({ data: qrData, transformation: { width: 72, height: 72 } })],
              }),
            ]),
            borderlessCell([
              new Paragraph({ children: [new TextRun({ text: "Verificação digital do laudo:", bold: true, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: getField(doc, "verificationUrl"), size: 20 })] }),
              ...(getField(doc, "hashSha256", "") ? [
                new Paragraph({ children: [new TextRun({ text: "Hash SHA-256:", bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: getField(doc, "hashSha256"), font: "Courier New", size: 14 })] }),
              ] : []),
            ]),
          ],
        }),
      ],
    }));
  } else {
    children.push(textParagraph(`Verificação digital do laudo: ${getField(doc, "verificationUrl")}`));
    if (getField(doc, "hashSha256", "")) {
      children.push(new Paragraph({ children: [new TextRun({ text: `Hash SHA-256: ${getField(doc, "hashSha256")}`, font: "Courier New", size: 16 })] }));
    }
  }

  children.push(sectionTitle("V. CONCLUSÃO"));
  children.push(textParagraph("Certifico que foram concluídas todas as operações de descontaminação, destruição e destinação das sucatas, conduzidas com rigoroso protocolo de segurança e controle."));
  children.push(textParagraph("Todo o processo ocorreu em ambiente seguro e protegido, sob constante supervisão e na presença de testemunhas, garantindo assim a transparência do procedimento desde a retirada do bem até o encaminhamento final da sucata para reciclagem."));
  children.push(textParagraph("O presente laudo foi redigido pelo representante legal da MARINGÁ SAT, Sr. Jardel F. Pinto, devidamente inscrito no CPF sob o nº 003.614.589-08."));

  if ((doc.fotos ?? []).length > 0) {
    children.push(sectionTitle("VI. REGISTRO FOTOGRÁFICO"));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NONE_BORDERS,
      rows: [
        new TableRow({
          children: (doc.fotos ?? []).map((foto, index) => {
            const image = photoData[index];
            const photoChildren: Paragraph[] = [];

            if (image) {
              photoChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({ data: image, transformation: { width: 220, height: 150 } })],
              }));
            } else {
              photoChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Imagem indisponível", italics: true, size: 20 })],
              }));
            }

            photoChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60 },
              children: [new TextRun({ text: foto.label, italics: true, size: 20 })],
            }));

            return borderlessCell(photoChildren);
          }),
        }),
      ],
    }));
  }

  children.push(new Paragraph({
    spacing: { before: 220, after: 520 },
    children: [new TextRun({ text: `Maringá/PR, ${getField(doc, "destructionDateLong")}.`, size: 24 })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { color: "000000", style: BorderStyle.SINGLE, size: 4 } },
    children: [
      new TextRun({ text: "Jardel F. Pinto", bold: true, size: 24 }),
      new TextRun({ text: "Representante Técnico Nomeado", break: 1, size: 24 }),
    ],
  }));

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, right: 900, bottom: 900, left: 900 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}