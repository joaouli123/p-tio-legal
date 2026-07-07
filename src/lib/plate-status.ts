export type PlateStatus = 'regular' | 'em_verificacao' | 'divergente' | 'suspeita_adulteracao';

export const MISSING_PLATE_VALUE = 'SEM PLACA';
export const SUPPRESSED_CHASSIS_VALUE = 'SUPRIMIDO';

export type PlateStatusRecord = {
  status_placa?: PlateStatus;
  placa_oficial?: string;
  marca_modelo_consulta?: string;
  ano_consulta?: string;
  cor_consulta?: string;
  tipo_consulta?: string;
};

const META_START = '[PLATE_META]';
const META_END = '[/PLATE_META]';
const META_REGEX = /\[PLATE_META\]\s*([\s\S]*?)\s*\[\/PLATE_META\]\s*/i;

export const PLATE_STATUS_LABELS: Record<PlateStatus, string> = {
  regular: 'Regular',
  em_verificacao: 'Em verificação',
  divergente: 'Placa divergente',
  suspeita_adulteracao: 'Suspeita de adulteração',
};

function normalizeText(value?: string | null) {
  return value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, '')
    .toUpperCase()
    .trim() ?? '';
}

const NORMALIZED_MISSING_PLATE = normalizeText(MISSING_PLATE_VALUE);
const NORMALIZED_SUPPRESSED_CHASSIS = normalizeText(SUPPRESSED_CHASSIS_VALUE);

export function isMissingPlateValue(value?: string | null) {
  return normalizeText(value) === NORMALIZED_MISSING_PLATE;
}

export function isSuppressedChassisValue(value?: string | null) {
  return normalizeText(value) === NORMALIZED_SUPPRESSED_CHASSIS;
}

function normalizeMetadataValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPlateStatus(value: string | undefined): value is PlateStatus {
  return value === 'regular'
    || value === 'em_verificacao'
    || value === 'divergente'
    || value === 'suspeita_adulteracao';
}

function normalizePlateMetadata(metadata: PlateStatusRecord): PlateStatusRecord {
  return {
    ...(isPlateStatus(metadata.status_placa) ? { status_placa: metadata.status_placa } : {}),
    ...(normalizeMetadataValue(metadata.placa_oficial) ? { placa_oficial: normalizeMetadataValue(metadata.placa_oficial) } : {}),
    ...(normalizeMetadataValue(metadata.marca_modelo_consulta) ? { marca_modelo_consulta: normalizeMetadataValue(metadata.marca_modelo_consulta) } : {}),
    ...(normalizeMetadataValue(metadata.ano_consulta) ? { ano_consulta: normalizeMetadataValue(metadata.ano_consulta) } : {}),
    ...(normalizeMetadataValue(metadata.cor_consulta) ? { cor_consulta: normalizeMetadataValue(metadata.cor_consulta) } : {}),
    ...(normalizeMetadataValue(metadata.tipo_consulta) ? { tipo_consulta: normalizeMetadataValue(metadata.tipo_consulta) } : {}),
  };
}

export function hasPlateMetadata(metadata: PlateStatusRecord) {
  const normalized = normalizePlateMetadata(metadata);
  return Object.keys(normalized).length > 0;
}

export function stripPlateMetadataBlock(text?: string | null) {
  return text?.replace(META_REGEX, '').trim() || '';
}

export function extractPlateMetadata(text?: string | null) {
  const match = text?.match(META_REGEX);
  const plainObservacoes = stripPlateMetadataBlock(text);

  if (!match?.[1]) {
    return { metadata: {} as PlateStatusRecord, observacoes: plainObservacoes };
  }

  try {
    const parsed = JSON.parse(match[1]) as PlateStatusRecord;
    return {
      metadata: normalizePlateMetadata(parsed),
      observacoes: plainObservacoes,
    };
  } catch {
    return { metadata: {} as PlateStatusRecord, observacoes: plainObservacoes };
  }
}

export function mergePlateMetadataIntoObservacoes(observacoes: string | null | undefined, metadata: PlateStatusRecord) {
  const cleanObservacoes = stripPlateMetadataBlock(observacoes);
  const normalized = normalizePlateMetadata(metadata);

  if (!hasPlateMetadata(normalized)) {
    return cleanObservacoes || undefined;
  }

  const block = `${META_START}\n${JSON.stringify(normalized)}\n${META_END}`;
  return cleanObservacoes ? `${block}\n\n${cleanObservacoes}` : block;
}

export function normalizeVehiclePlateRecord<T extends { observacoes?: string | null } & PlateStatusRecord>(record: T): T {
  const extracted = extractPlateMetadata(record.observacoes);
  const merged = normalizePlateMetadata({
    ...extracted.metadata,
    status_placa: record.status_placa,
    placa_oficial: record.placa_oficial,
    marca_modelo_consulta: record.marca_modelo_consulta,
    ano_consulta: record.ano_consulta,
    cor_consulta: record.cor_consulta,
    tipo_consulta: record.tipo_consulta,
  });

  return {
    ...record,
    ...merged,
    observacoes: extracted.observacoes || undefined,
  };
}

export function buildPlateMetadataPayload<T extends { observacoes?: string | null } & PlateStatusRecord>(record: T): T {
  const metadata = normalizePlateMetadata(record);
  return {
    ...record,
    ...metadata,
    observacoes: mergePlateMetadataIntoObservacoes(record.observacoes, metadata),
  };
}

export function detectPlateDivergence(input: {
  placa?: string | null;
  placa_oficial?: string | null;
  marca_modelo?: string | null;
  marca_modelo_consulta?: string | null;
  ano?: string | null;
  ano_consulta?: string | null;
  cor?: string | null;
  cor_consulta?: string | null;
  tipo?: string | null;
  tipo_consulta?: string | null;
}) {
  const officialPlate = normalizeText(input.placa_oficial);
  const displayedPlate = normalizeText(input.placa);

  if (officialPlate && displayedPlate && !isMissingPlateValue(input.placa) && officialPlate !== displayedPlate) {
    return true;
  }

  const comparisons: Array<[string, string]> = [
    [normalizeText(input.marca_modelo), normalizeText(input.marca_modelo_consulta)],
    [normalizeText(input.ano), normalizeText(input.ano_consulta)],
    [normalizeText(input.cor), normalizeText(input.cor_consulta)],
    [normalizeText(input.tipo), normalizeText(input.tipo_consulta)],
  ];

  return comparisons.some(([observed, official]) => !!observed && !!official && observed !== official);
}

export function resolvePlateStatus(input: {
  status_placa?: PlateStatus | string | null;
  placa?: string | null;
  placa_oficial?: string | null;
  marca_modelo?: string | null;
  marca_modelo_consulta?: string | null;
  ano?: string | null;
  ano_consulta?: string | null;
  cor?: string | null;
  cor_consulta?: string | null;
  tipo?: string | null;
  tipo_consulta?: string | null;
}): PlateStatus {
  const requested = isPlateStatus(input.status_placa ?? undefined) ? input.status_placa : undefined;

  if (detectPlateDivergence(input)) {
    return requested === 'suspeita_adulteracao' ? requested : 'divergente';
  }

  return requested ?? 'regular';
}